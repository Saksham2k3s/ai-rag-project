import express from "express";
import cors from "cors";

import chatRouter from "./routes/chat.routes.js";
import documentRouter from "./routes/document.routes.js";
import authRouter from "./routes/auth.route.js";
import conversationRouter from "./routes/conversation.routes.js";

import { createCollection } from "./services/qdrant.service.js";

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
  .then(() => {
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize Qdrant:", error);
  });