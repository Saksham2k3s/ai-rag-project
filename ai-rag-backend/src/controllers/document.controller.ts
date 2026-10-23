import { Request, Response } from "express";
import { extractTextFromPdf } from "../services/pdf.service.js";
import { chunkText } from "../services/chunk.service.js";
import {
  generateEmbedding,
  generateEmbeddings,
} from "../services/embedding.service.js";
import {
  deleteDocumentChunks,
  insertDocumentChunks,
  searchSimilarChunks,
} from "../services/qdrant.service.js";
import { generateText } from "../services/gemini.service.js";
import { buildContext, buildRagPrompt } from "../services/rag.service.js";
import { prisma } from "../services/prisma.service.js";
import { documentQueue } from "../queues/document.queue.js";
import { uploadPdf, deletePdf } from "../services/storage.service.js";

export async function uploadDocument(req: Request, res: Response) {
  let documentId: string | undefined;
  let storagePath: string | undefined;
  let fileUploaded = false;
  let jobQueued = false;

  try {
    if (!req.file) {
      return res.status(400).json({
        message: "PDF file is required",
      });
    }

    if (req.file.buffer.toString("utf8", 0, 5) !== "%PDF-") {
      return res.status(400).json({
        message: "Only PDF files are allowed",
      });
    }

    const ownerId = req.user?.userId;

    if (!ownerId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // 1. Create the document record.
    const document = await prisma.document.create({
      data: {
        filename: req.file.originalname,
        size: req.file.size,
        totalChunks: 0,
        status: "PROCESSING",
        ownerId,
      },
    });

    documentId = document.id;
    storagePath = `${ownerId}/${documentId}.pdf`;

    // 2. Store the PDF so the worker can access it later.
    await uploadPdf(storagePath, req.file.buffer);
    fileUploaded = true;

    // 3. Queue the background job.
    const job = await documentQueue.add(
      "process-pdf",
      {
        documentId,
        ownerId,
        storagePath,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    jobQueued = true;

    // 4. Tell the client processing has started, not completed.
    return res.status(202).json({
      message: "PDF uploaded and processing has been queued",
      documentId,
      status: "PROCESSING",
      jobId: job.id,
    });
  } catch (error) {
    console.error("PDF upload or queue error:", error);

    // Clean up resources if queuing failed.
    if (documentId && !jobQueued) {
      if (fileUploaded && storagePath) {
        try {
          await deletePdf(storagePath);
        } catch (cleanupError) {
          console.error("PDF cleanup failed:", cleanupError);
        }
      }

      try {
        await prisma.document.delete({
          where: { id: documentId },
        });
      } catch (cleanupError) {
        console.error("Document cleanup failed:", cleanupError);
      }
    }

    return res.status(500).json({
      message: "Failed to upload or queue PDF processing",
    });
  }
}

export async function searchDocuments(req: Request, res: Response) {
  try {
    const { query, documentId } = req.body ?? {};

    // 1. Get authenticated user
    const ownerId = req.user?.userId;

    if (!ownerId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // 2. Validate query
    if (!query) {
      return res.status(400).json({
        message: "Query is required",
      });
    }

    // 3. Verify document ownership and status
    if (documentId) {
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          ownerId,
        },
      });

      if (!document) {
        return res.status(404).json({
          message: "Document not found",
        });
      }

      if (document.status === "PROCESSING") {
        return res.status(400).json({
          message: "Document is still processing. Please wait until processing completes.",
        });
      }

      if (document.status === "FAILED") {
        return res.status(400).json({
          message: "Document processing failed. Please re-upload the document.",
        });
      }

      if (document.status !== "ACTIVE") {
        return res.status(400).json({
          message: "Document is not available for search",
        });
      }
    }

    // 4. Question → embedding
    const queryEmbedding = await generateEmbedding(query);

    // 5. Search relevant chunks
    const results = await searchSimilarChunks(
      queryEmbedding,
      3,
      documentId,
      ownerId,
    );

    // 6. Retrieved chunks → context
    const context = buildContext(results);

    // 7. Context + question → RAG prompt
    const prompt = buildRagPrompt(query, context);

    // 8. Send prompt to Gemini
    const answer = await generateText(prompt);

    // 9. Return response
    return res.json({
      query,
      answer,
      sources: results,
    });
  } catch (error) {
    console.error("RAG search error:", error);

    return res.status(500).json({
      message: "Failed to answer query",
    });
  }
}

export async function getDocuments(req: Request, res: Response) {
  try {
    const ownerId = req.user?.userId;

    if (!ownerId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }
    const documents = await prisma.document.findMany({
      where: {
        ownerId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      documents,
    });
  } catch (error) {
    console.error("Get documents error:", error);

    return res.status(500).json({
      message: "Failed to fetch documents",
    });
  }
}

export async function getDocumentStatus(req: Request, res: Response) {
  try {
    const ownerId = req.user?.userId;
    const documentId = req.params.documentId;

    if (!ownerId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (typeof documentId !== "string" || !documentId.trim()) {
      return res.status(400).json({
        message: "Invalid document ID",
      });
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId.trim(),
        ownerId,
      },
      select: {
        id: true,
        filename: true,
        status: true,
        totalChunks: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    return res.json({
      documentId: document.id,
      filename: document.filename,
      status: document.status,
      totalChunks: document.totalChunks,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Get document status error:", error);

    return res.status(500).json({
      message: "Failed to fetch document status",
    });
  }
}

export async function deleteDocument(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const documentId = req.params.id;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (typeof documentId !== "string" || !documentId.trim()) {
      return res.status(400).json({
        message: "Invalid document ID",
      });
    }

    const cleanDocumentId = documentId.trim();

    // 1. Verify document ownership
    const document = await prisma.document.findFirst({
      where: {
        id: cleanDocumentId,
        ownerId: userId,
      },
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    // 2. Mark document as DELETING immediately so any running worker will abort
    await prisma.document.updateMany({
      where: {
        id: cleanDocumentId,
        ownerId: userId,
      },
      data: {
        status: "DELETING",
      },
    });

    // 3. Delete stored PDF from Supabase Storage
    const storagePath = `${userId}/${cleanDocumentId}.pdf`;
    try {
      await deletePdf(storagePath);
    } catch (storageError) {
      console.error(
        `Failed to delete PDF from Supabase storage for document ${cleanDocumentId}:`,
        storageError,
      );
      // Non-fatal if file was already removed or never created; proceed with vector and DB cleanup
    }

    // 4. Delete vectors from Qdrant
    try {
      await deleteDocumentChunks(cleanDocumentId);
    } catch (qdrantError) {
      console.error(
        `Failed to delete vectors from Qdrant for document ${cleanDocumentId}:`,
        qdrantError,
      );
    }

    // 5. Delete document record from PostgreSQL
    try {
      await prisma.document.delete({
        where: {
          id: cleanDocumentId,
        },
      });

      return res.json({
        message: "Document deleted successfully",
      });
    } catch (dbError) {
      console.error("Database deletion failed:", dbError);

      return res.status(500).json({
        message: "Document deletion is in progress and requires cleanup",
      });
    }
  } catch (error) {
    console.error("Delete document error:", error);

    return res.status(500).json({
      message: "Failed to delete document",
    });
  }
}
