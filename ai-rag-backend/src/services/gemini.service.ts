import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if(!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
}

const ai = new GoogleGenAI({
    apiKey: apiKey,
});

export async function generateText(prompt: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: prompt,
  });

  return response.text;
}

export async function generateTextStream(
  prompt: string,
  maxRetries = 3
) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const stream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
      });

      return stream;
    } catch (error: any) {
      const status = error?.status;

      if (status !== 503 || attempt === maxRetries) {
        throw error;
      }

      const delay = 2000 * Math.pow(2, attempt);

      console.log(
        `Gemini is busy. Retrying in ${delay / 1000}s...`
      );

      await new Promise((resolve) =>
        setTimeout(resolve, delay)
      );
    }
  }

  throw new Error("Failed to generate Gemini response");
}