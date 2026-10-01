import express from "express";
import chatRouter from "./routes/chat.routes.js";
import documentRouter from "./routes/document.routes.js";
import authRouter from "./routes/auth.route.js";
import conversationRouter from "./routes/conversation.routes.js"
import { createCollection } from "./services/qdrant.service.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "AI RAG Backend is running",
  });
});

app.use("/api", chatRouter);
app.use("/api", documentRouter);
app.use("/api", authRouter);
app.use("/api", conversationRouter)

const PORT = process.env.PORT || 4000;

createCollection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize Qdrant:", error);
  });