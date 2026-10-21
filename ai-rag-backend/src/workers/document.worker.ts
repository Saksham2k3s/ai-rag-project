import { Worker } from "bullmq";
import { redis } from "../config/redis";

export const documentWorker = new Worker(
  "document-processing",
  async (job) => {
    console.log("Processing job:", job.name);
    console.log("Job data:", job.data);

    return {
      success: true,
      documentId: job.data.documentId,
    };
  },
  {
    connection: redis,
  },
);

documentWorker.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

documentWorker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});
