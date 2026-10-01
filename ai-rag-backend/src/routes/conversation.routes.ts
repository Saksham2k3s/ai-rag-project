import { Router } from "express";
import {
  getConversations,
  getConversationById,
} from "../controllers/conversation.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/conversations",
  authenticate,
  getConversations
);

router.get(
  "/conversations/:id",
  authenticate,
  getConversationById
);

export default router;