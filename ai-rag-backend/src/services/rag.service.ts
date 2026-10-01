type RetrievedChunk = {
  payload?: Record<string, unknown> | null;
};

export function buildContext(chunks: RetrievedChunk[]) {
  return chunks
    .map((chunk, index) => {
      const text =
        typeof chunk.payload?.text === "string" ? chunk.payload.text : "";

      return `[Context ${index + 1}]\n${text}`;
    })
    .join("\n\n");
}

export function buildRagPrompt(
  question: string,
  context: string,
  conversationHistory = "",
) {
  return `
You are an AI assistant answering questions based on the provided documents.

Rules:
- Answer using the provided document context.
- Use conversation history only to understand references and follow-up questions.
- Do not make up information.
- If the answer cannot be found in the documents, say:
"I don't have enough information in the provided documents."
- Answer clearly and concisely.

Conversation History:
${conversationHistory || "No previous conversation."}

Document Context:
${context || "No relevant document context was found."}

Current Question:
${question}
`;
}

type ConversationMessage = {
  role: string;
  content: string;
};

export function buildConversationHistory(messages: ConversationMessage[]) {
  return messages
    .map((message) => {
      const role = message.role === "user" ? "User" : "Assistant";

      return `${role}: ${message.content}`;
    })
    .join("\n");
}
