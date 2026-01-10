/**
 * Redis Client
 * Connection to Redis for caching and rate limiting
 */

import Redis from "ioredis";
import { env } from "@config/env";
import { createLogger } from "@core/logger";

const logger = createLogger("redis");

let redis: Redis | null = null;

/**
 * Get or create Redis client
 */
export function getRedis(): Redis | null {
  if (!env.REDIS_URL) {
    return null;
  }

  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
    });

    redis.on("connect", () => {
      logger.info("Redis connected");
    });

    redis.on("error", (err) => {
      logger.error({ error: err.message }, "Redis error");
    });
  }

  return redis;
}

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  const client = getRedis();

  if (!client) {
    return { connected: false, latencyMs: 0 };
  }

  try {
    const start = Date.now();
    await client.ping();
    const latencyMs = Date.now() - start;
    return { connected: true, latencyMs };
  } catch (err) {
    return {
      connected: false,
      latencyMs: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Disconnect Redis
 */
export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info("Redis disconnected");
  }
}

export { redis };
