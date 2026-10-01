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
import { randomUUID } from "crypto";
import { prisma } from "../services/prisma.service.js";

export async function uploadDocument(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "PDF file is required",
      });
    }

    const ownerId = req.user?.userId;

    if (!ownerId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const text = await extractTextFromPdf(req.file.buffer);
    const chunks = chunkText(text);

    const document = await prisma.document.create({
      data: {
        filename: req.file.originalname,
        size: req.file.size,
        totalChunks: chunks.length,
        ownerId,
      },
    });

    const documentId = document.id;

    const embeddings = await generateEmbeddings(chunks);

    await insertDocumentChunks(documentId, ownerId, chunks, embeddings);

    return res.json({
      message: "PDF processed successfully",
      totalCharacters: text.length,
      totalChunks: chunks.length,
      documentId,
      chunks,
      embeddingDimension: embeddings[0]?.length ?? 0,
    });
  } catch (error) {
    console.error("PDF processing error:", error);

    return res.status(500).json({
      message: "Failed to process PDF",
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

    // 3. Verify document ownership
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
    }

    // 4. Question → embedding
    const queryEmbedding = await generateEmbedding(query);

    // 5. Search relevant chunks
    const results = await searchSimilarChunks(
      queryEmbedding,
      3,
      documentId,
      ownerId
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

    // 1. Verify document ownership
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        ownerId: userId,
        status: "ACTIVE",
      },
    });

    if (!document) {
      return res.status(404).json({
        message: "Document not found",
      });
    }

    // 2. Mark document as DELETING
    await prisma.document.update({
      where: {
        id: documentId,
      },
      data: {
        status: "DELETING",
      },
    });

    try {
      // 3. Delete vectors from Qdrant
      await deleteDocumentChunks(documentId);

      // 4. Delete document metadata from PostgreSQL
      await prisma.document.delete({
        where: {
          id: documentId,
        },
      });

      return res.json({
        message: "Document deleted successfully",
      });
    } catch (error) {
      console.error("Document deletion failed:", error);

      // Keep the document with DELETING status
      // so it can be retried/cleaned later.
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
