import "dotenv/config";
import { documentWorker } from "./workers/document.worker.js";
import { redis } from "./config/redis.js";

console.log("==========================================");
console.log(" CogniRAG Background PDF Worker Started ");
console.log(" Listening on queue: document-processing ");
console.log("==========================================");

let isShuttingDown = false;

async function handleShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\nReceived ${signal}. Shutting down worker gracefully...`);

  try {
    // Stop accepting new jobs and wait for running jobs to finish
    await documentWorker.close();
    console.log("BullMQ worker closed.");

    // Close Redis connection
    await redis.quit();
    console.log("Redis connection closed.");

    console.log("Worker process exited gracefully.");
    process.exit(0);
  } catch (err) {
    console.error("Error during graceful shutdown:", err);
    process.exit(1);
  }
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

