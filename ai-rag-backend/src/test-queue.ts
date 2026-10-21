import { documentQueue } from "./queues/document.queue.js";
import { documentWorker } from "./workers/document.worker.js";

async function testQueue() {
  try {
    const job = await documentQueue.add("test-job", {
      documentId: "test-document-123",
      ownerId: "test-user-123",
    });

    console.log("Job added:", job.id);
  } catch (error) {
    console.error("Queue test failed:", error);
  } finally {
    await documentWorker.close();
    await documentQueue.close();
  }
}

testQueue();
