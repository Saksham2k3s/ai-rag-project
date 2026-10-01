import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "GEMINI_API_KEY is not defined in the environment variables."
  );
}

const ai = new GoogleGenAI({
  apiKey,
});

export async function generateEmbedding(text: string) {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
  });

  return response.embeddings?.[0]?.values ?? [];
}

export async function generateEmbeddings(texts: string[]) {
  const embeddings = [];

  for (const text of texts) {
    const embedding = await generateEmbedding(text);

    embeddings.push(embedding);
  }

  return embeddings;
}