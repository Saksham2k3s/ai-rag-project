import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

redis.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

redis.on("connect", () => {
  console.log("Redis connected successfully");
});

/**
 * Creates a dedicated Redis connection.
 * BullMQ Worker instances require dedicated connections to avoid
 * lock renewal and blocking-pop contention with BullMQ Queues.
 */
export function createRedisClient(): Redis {
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  client.on("error", (error) => {
    console.error("Worker Redis connection error:", error.message);
  });

  return client;
}
