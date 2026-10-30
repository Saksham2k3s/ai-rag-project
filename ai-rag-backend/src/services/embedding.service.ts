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

/**
 * Extracts retry delay in milliseconds from a 429 quota/rate limit error.
 * Gemini provides hints like "Please retry in 37.37s" or details with retryDelay: "37s".
 */
function extractRetryDelayMs(error: any, fallbackDelayMs = 40000): number {
  if (!error) return fallbackDelayMs;

  const raw =
    typeof error === "string"
      ? error
      : typeof error.message === "string"
      ? error.message
      : JSON.stringify(error);

  // Check for "retry in X.Xs" or "retry in Xs"
  const retryMatch = raw.match(/retry in\s+([\d\.]+)\s*s/i);
  if (retryMatch && retryMatch[1]) {
    const sec = parseFloat(retryMatch[1]);
    if (!isNaN(sec) && sec > 0) {
      // Add 2s padding to ensure the quota window has rolled over
      return Math.ceil(sec * 1000) + 2000;
    }
  }

  // Check for JSON string "retryDelay":"37s"
  const delayMatch = raw.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (delayMatch && delayMatch[1]) {
    const sec = parseInt(delayMatch[1], 10);
    if (!isNaN(sec) && sec > 0) {
      return (sec + 2) * 1000;
    }
  }

  // Check structured details array if present
  if (Array.isArray(error.details)) {
    const retryInfo = error.details.find((d: any) => d && d.retryDelay);
    if (retryInfo && typeof retryInfo.retryDelay === "string") {
      const sec = parseInt(retryInfo.retryDelay.replace(/s$/i, ""), 10);
      if (!isNaN(sec) && sec > 0) {
        return (sec + 2) * 1000;
      }
    }
  }

  return fallbackDelayMs;
}

/**
 * Determines whether an error is a rate limit or quota exhaustion error.
 */
function isRateLimitError(error: any): boolean {
  if (!error) return false;
  if (
    error.status === 429 ||
    error.status === "RESOURCE_EXHAUSTED" ||
    error.code === 429
  ) {
    return true;
  }
  const raw =
    typeof error === "string"
      ? error
      : typeof error.message === "string"
      ? error.message
      : JSON.stringify(error);
  const lower = raw.toLowerCase();
  return (
    lower.includes("429") ||
    lower.includes("quota exceeded") ||
    lower.includes("resource_exhausted") ||
    lower.includes("rate-limits") ||
    lower.includes("tokens per minute") ||
    lower.includes("rate limit")
  );
}

/**
 * Generates an embedding vector for a single text chunk with automatic
 * retry and backoff handling for rate limits and transient errors.
 */
export async function generateEmbedding(
  text: string,
  maxRetries = 5,
): Promise<number[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: text,
      });

      return response.embeddings?.[0]?.values ?? [];
    } catch (error: any) {
      const isRateLimit = isRateLimitError(error);

      if (attempt >= maxRetries) {
        console.error(
          `[Embedding] Failed after ${maxRetries} attempts:`,
          error.message || error,
        );
        throw error;
      }

      if (isRateLimit) {
        const delayMs = extractRetryDelayMs(error, 40000);
        console.warn(
          `[Embedding] Free tier token quota reached (429). Waiting ${Math.round(
            delayMs / 1000,
          )}s for quota window to reset (retry ${attempt}/${maxRetries})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        // Transient error (network, 503, etc.)
        const delayMs = Math.min(30000, 2000 * Math.pow(2, attempt));
        console.warn(
          `[Embedding] Transient error (${error.message || error}). Retrying in ${Math.round(
            delayMs / 1000,
          )}s (attempt ${attempt}/${maxRetries})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error("Failed to generate embedding: max retries reached");
}

/**
 * Generates embeddings for an array of text chunks sequentially with
 * gentle pacing to avoid bursting the tokens-per-minute quota.
 */
export async function generateEmbeddings(
  texts: string[],
  onProgress?: (processed: number, total: number) => Promise<void> | void,
): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    const embedding = await generateEmbedding(text);
    embeddings.push(embedding);

    if (onProgress) {
      try {
        await onProgress(i + 1, texts.length);
      } catch (progressErr) {
        // Non-blocking progress error
      }
    }

    // Pacing delay between chunk calls to reduce burst consumption of the token quota
    if (i < texts.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  return embeddings;
}