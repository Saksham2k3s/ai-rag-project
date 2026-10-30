import express from "express";
import cors from "cors";

import chatRouter from "./routes/chat.routes.js";
import documentRouter from "./routes/document.routes.js";
import authRouter from "./routes/auth.route.js";
import conversationRouter from "./routes/conversation.routes.js";

import { createCollection } from "./services/qdrant.service.js";
import { prisma } from "./services/prisma.service.js";
import { documentQueue } from "./queues/document.queue.js";

// Initialize BullMQ worker inline for standard/dev server execution
if (process.env.DISABLE_INLINE_WORKER !== "true") {
  import("./workers/document.worker.js")
    .then(() => {
      console.log("Document processing worker active");
    })
    .catch((err) => {
      console.error("Failed to initialize document worker:", err);
    });
}

// Reconcile and process any documents that were stuck in PROCESSING
async function reconcileStuckDocuments() {
  try {
    const stuckDocs = await prisma.document.findMany({
      where: { status: "PROCESSING" },
    });

    if (stuckDocs.length > 0) {
      console.log(`[Worker] Found ${stuckDocs.length} pending document(s) in PROCESSING state.`);
      for (const doc of stuckDocs) {
        console.log(`[Worker] Enqueueing pending document: ${doc.id} (${doc.filename})`);
        await documentQueue.add(
          "process-pdf",
          {
            documentId: doc.id,
            ownerId: doc.ownerId,
            storagePath: `${doc.ownerId}/${doc.id}.pdf`,
          },
          {
            jobId: `reconcile-${doc.id}`,
            attempts: 5,
            backoff: {
              type: "exponential",
              delay: 10000,
            },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        );
      }
    }
  } catch (err: any) {
    console.warn("Could not reconcile stuck documents on startup:", err.message);
  }
}

const app = express();

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://ai-rag-project-five.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "AI RAG Backend is running",
  });
});

// Routes
app.use("/api", chatRouter);
app.use("/api", documentRouter);
app.use("/api", authRouter);
app.use("/api", conversationRouter);

const PORT = process.env.PORT || 4000;

createCollection()
  .then(async () => {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Reconcile and process any documents that were stuck in PROCESSING
    await reconcileStuckDocuments();
  })
  .catch((error) => {
    console.error("Failed to initialize Qdrant:", error);
  });