import { Request, Response } from "express";
import { prisma } from "../services/prisma.service.js";
import { generateEmbedding } from "../services/embedding.service.js";
import { searchSimilarChunks } from "../services/qdrant.service.js";
import {
  buildContext,
  buildRagPrompt,
  buildConversationHistory,
} from "../services/rag.service.js";
import { generateTextStream } from "../services/gemini.service.js";
import {
  createConversation,
  getConversation,
  addMessage,
} from "../services/conversation.service.js";

export async function chat(req: Request, res: Response) {
  try {
    const { message, documentId, conversationId } = req.body ?? {};

    // 1. Get authenticated user
    const ownerId = req.user?.userId;

    if (!ownerId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // 2. Validate and clean message
    if (typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({
        message: "Message is required",
      });
    }

    const cleanMessage = message.trim();

    // 3. Validate and clean documentId
    if (
      documentId !== undefined &&
      (typeof documentId !== "string" || documentId.trim().length === 0)
    ) {
      return res.status(400).json({
        message: "Invalid documentId",
      });
    }

    const cleanDocumentId =
      typeof documentId === "string" ? documentId.trim() : undefined;

    // 4. Verify document ownership
    if (cleanDocumentId) {
      const document = await prisma.document.findFirst({
        where: {
          id: cleanDocumentId,
          ownerId,
          status: "ACTIVE"
        },
      });

      if (!document) {
        return res.status(404).json({
          message: "Document not found",
        });
      }
    }

    // 5. Validate and clean conversationId
    if (
      conversationId !== undefined &&
      (typeof conversationId !== "string" || conversationId.trim().length === 0)
    ) {
      return res.status(400).json({
        message: "Invalid conversationId",
      });
    }

    const cleanConversationId =
      typeof conversationId === "string" ? conversationId.trim() : undefined;

    // 6. Create or verify conversation
    let activeConversationId: string;
    let conversationHistory = "";

    if (cleanConversationId) {
      const conversation = await getConversation(cleanConversationId, ownerId);

      if (!conversation) {
        return res.status(404).json({
          message: "Conversation not found",
        });
      }

      activeConversationId = conversation.id;

      const recentMessages = conversation.messages.slice(-10);

      conversationHistory = buildConversationHistory(recentMessages);
    } else {
      const conversation = await createConversation(
        ownerId,
        cleanMessage.slice(0, 50),
      );

      activeConversationId = conversation.id;
    }

    // 7. Save user's message
    await addMessage(activeConversationId, "user", cleanMessage);

    // 8. Question → embedding
    const queryEmbedding = await generateEmbedding(cleanMessage);

    // 9. Search relevant chunks
    // documentId exists → search only that document
    // documentId absent → search all user's documents
    const results = await searchSimilarChunks(
      queryEmbedding,
      3,
      cleanDocumentId,
      ownerId,
    );

    // 10. Retrieved chunks → context
    const context = buildContext(results);

    // 11. Context + question → RAG prompt
    const prompt = buildRagPrompt(cleanMessage, context, conversationHistory);

    // 12. Stream Gemini response
    const stream = await generateTextStream(prompt);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // 13. Collect complete AI response
    let assistantResponse = "";

    for await (const chunk of stream) {
      const text = chunk.text;

      if (text) {
        assistantResponse += text;

        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // Don't save an empty assistant message
    if (!assistantResponse.trim()) {
      throw new Error("Gemini returned an empty response");
    }

    // 14. Save AI response
    await addMessage(activeConversationId, "assistant", assistantResponse);

    // 15. Send completion event
    res.write(
      `data: ${JSON.stringify({
        done: true,
        conversationId: activeConversationId,
      })}\n\n`,
    );

    res.end();
  } catch (error) {
    console.error("RAG chat error:", error);

    // Error before SSE headers are sent
    if (!res.headersSent) {
      return res.status(500).json({
        message: "Failed to generate response",
      });
    }

    // Error after SSE streaming has started
    res.write(
      `data: ${JSON.stringify({
        error: "Failed to generate response",
      })}\n\n`,
    );

    res.end();
  }
}
