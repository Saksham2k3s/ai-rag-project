import { Request, Response } from "express";
import {
  getUserConversations,
  getConversation,
} from "../services/conversation.service.js";

export async function getConversations(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const conversations = await getUserConversations(userId);

    return res.json({
      conversations,
    });
  } catch (error) {
    console.error("Get conversations error:", error);

    return res.status(500).json({
      message: "Failed to fetch conversations",
    });
  }
}

export async function getConversationById(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const id = req.params.id;

    if (typeof id !== "string") {
      return res.status(400).json({
        message: "Invalid conversation ID",
      });
    }

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const conversation = await getConversation(id, userId);

    if (!conversation) {
      return res.status(404).json({
        message: "Conversation not found",
      });
    }

    return res.json({
      conversation,
    });
  } catch (error) {
    console.error("Get conversation error:", error);

    return res.status(500).json({
      message: "Failed to fetch conversation",
    });
  }
}
