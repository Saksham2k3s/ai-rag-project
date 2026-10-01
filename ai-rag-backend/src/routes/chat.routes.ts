import { Router } from "express";
import { chat } from "../controllers/chat.controller";
import { authenticate } from "../middleware/auth.middleware";


const router = Router()

router.post("/chat", authenticate, chat);

export default router;