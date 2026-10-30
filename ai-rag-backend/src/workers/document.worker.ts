import { Worker } from "bullmq";
import { createRedisClient } from "../config/redis.js";
import { prisma } from "../services/prisma.service.js";
import { downloadPdf } from "../services/storage.service.js";
import { extractTextFromPdf } from "../services/pdf.service.js";
import { chunkText } from "../services/chunk.service.js";
import { generateEmbeddings } from "../services/embedding.service.js";
import {
  insertDocumentChunks,
  deleteDocumentChunks,
} from "../services/qdrant.service.js";

type DocumentJobData = {
  documentId: string;
  ownerId: string;
  storagePath: string;
};

// Dedicated Redis connection for the BullMQ worker to eliminate command contention
export const workerRedis = createRedisClient();

export const documentWorker = new Worker<DocumentJobData>(
  "document-processing",
  async (job) => {
    const { documentId, ownerId, storagePath } = job.data;

    console.log(`[Job ${job.id}] Processing document ${documentId} (attempt ${job.attemptsMade + 1})`);

    // 1. Verify the document still exists and is processing.
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        ownerId,
        status: "PROCESSING",
      },
    });

    if (!document) {
      console.log(`[Job ${job.id}] Skipping document ${documentId}: not in PROCESSING status`);
      return { skipped: true };
    }

    // 2. Download the original PDF.
    console.log(`[Job ${job.id}] Downloading PDF: ${storagePath}`);
    const pdfBuffer = await downloadPdf(storagePath);

    // 3. Extract text and create chunks.
    console.log(`[Job ${job.id}] Extracting text from PDF...`);
    const text = await extractTextFromPdf(pdfBuffer);

    if (!text || !text.trim()) {
      throw new Error("PDF contains no extractable text");
    }

    const chunks = chunkText(text);

    if (chunks.length === 0) {
      throw new Error("No text chunks were generated from PDF");
    }

    console.log(`[Job ${job.id}] Generated ${chunks.length} text chunks. Creating embeddings...`);

    // 4. Generate embeddings with rate limit resilience and progress reporting
    const embeddings = await generateEmbeddings(chunks, async (processed, total) => {
      const percent = Math.round((processed / total) * 100);
      if (processed % 10 === 0 || processed === total) {
        await job.updateProgress(percent);
        console.log(`[Job ${job.id}] Embedding progress: ${processed}/${total} chunks (${percent}%)`);
      }
    });

    // 5. Store the chunks in Qdrant with deterministic IDs (batched for safety)
    console.log(`[Job ${job.id}] Upserting ${chunks.length} chunks into Qdrant...`);
    await insertDocumentChunks(documentId, ownerId, chunks, embeddings);

    // 6. Mark the document active only if it is still processing.
    console.log(`[Job ${job.id}] Updating document ${documentId} status to ACTIVE in database...`);
    const updated = await prisma.document.updateMany({
      where: {
        id: documentId,
        ownerId,
        status: "PROCESSING",
      },
      data: {
        totalChunks: chunks.length,
        status: "ACTIVE",
      },
    });

    if (updated.count === 0) {
      // The document changed state (e.g. marked DELETING or deleted) while we were processing it.
      console.log(`[Job ${job.id}] Document ${documentId} state changed during processing. Cleaning up Qdrant.`);
      await deleteDocumentChunks(documentId).catch((cleanupErr) =>
        console.error(`Failed to cleanup Qdrant chunks for ${documentId}:`, cleanupErr)
      );

      return { skipped: true };
    }

    console.log(`[Job ${job.id}] Document ${documentId} processed successfully (${chunks.length} chunks).`);

    return {
      success: true,
      documentId,
      totalChunks: chunks.length,
    };
  },
  {
    connection: workerRedis,
    concurrency: 1, // Single document processing to stay within Gemini token quota
    lockDuration: 300000, // 5 minutes (prevents lock expiration during rate-limit pauses)
    lockRenewTime: 60000, // Renew lock every 60s
    stalledInterval: 60000, // Check stalled jobs every 60s
    maxStalledCount: 2,
  },
);

// Runs after a job attempt fails.
documentWorker.on("failed", async (job, error) => {
  if (!job) return;

  const maxAttempts = job.opts.attempts ?? 1;
  console.error(`[Job ${job.id}] Attempt ${job.attemptsMade}/${maxAttempts} failed for document ${job.data?.documentId}: ${error.message}`);

  // Do not mark FAILED while BullMQ can still retry.
  if (job.attemptsMade < maxAttempts) {
    return;
  }

  // Final retry exhausted: mark document as FAILED and clean up any partial vectors
  try {
    const updated = await prisma.document.updateMany({
      where: {
        id: job.data.documentId,
        ownerId: job.data.ownerId,
        status: "PROCESSING",
      },
      data: {
        status: "FAILED",
      },
    });

    if (updated.count > 0) {
      console.error(`Document ${job.data.documentId} exhausted retries; marked as FAILED.`);
    }

    // Clean up any partial Qdrant chunks so failed documents don't leave orphaned vectors
    await deleteDocumentChunks(job.data.documentId).catch((cleanupErr) =>
      console.error(`Failed to clean up Qdrant chunks for failed document ${job.data.documentId}:`, cleanupErr)
    );
  } catch (updateError) {
    console.error("Failed to update document status on final failure:", updateError);
  }
});

documentWorker.on("completed", (job) => {
  console.log(`[Job ${job.id}] Completed successfully for document ${job.data?.documentId}`);
});

documentWorker.on("error", (err) => {
  console.error("Document worker encountered an unexpected error:", err.message);
});
