/**
 * Rate Limit Plugin
 * Redis-backed rate limiting for Elysia (with in-memory fallback)
 */

import { Elysia } from "elysia";
import { TooManyRequestsException } from "@core/exceptions";
import { getRedis } from "@core/redis";
import { createLogger } from "@core/logger";

const logger = createLogger("rate-limit");

interface RateLimitOptions {
  /** Time window in milliseconds (default: 1 min) */
  windowMs?: number;
  /** Max requests per window (default: 100) */
  max?: number;
  /** Unique identifier for this rate limiter (to persist limits across restarts) */
  id?: string;
  /** Key generator - defaults to IP */
  keyGenerator?: (request: Request) => string;
  /** Skip function - return true to bypass rate limit */
  skip?: (request: Request) => boolean;
  /** Prefix for Redis keys */
  keyPrefix?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory fallback store
const memoryStores = new Map<string, Map<string, RateLimitEntry>>();

/**
 * Create a rate limiter plugin (Redis-backed with in-memory fallback)
 */
export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60 * 1000,
    max = 100,
    id = crypto.randomUUID(),
    keyGenerator = getClientIP,
    skip,
    keyPrefix = "rl",
  } = options;

  logger.info({ id, max, windowMs }, "Rate limiter initialized");

  // Memory fallback
  const memoryStore = new Map<string, RateLimitEntry>();
  memoryStores.set(id, memoryStore);

  // Cleanup memory store
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.resetAt < now) {
        memoryStore.delete(key);
      }
    }
  }, windowMs);
  
  if (cleanup.unref) cleanup.unref();

  return new Elysia({ name: `rate-limit-${id}` }).onBeforeHandle(
    { as: "global" },
    async ({ request, set, path }) => {
      logger.debug({ path }, "Rate limit hook triggered");

      if (skip?.(request)) {
        logger.debug({ path }, "Rate limit skipped");
        return;
      }

      const clientKey = keyGenerator(request);
      const now = Date.now();
      const redis = getRedis();

      let count: number;
      let resetAt: number;

      if (redis) {
        const redisKey = `${keyPrefix}:${id}:${clientKey}`;
        try {
          const result = await redis
            .multi()
            .incr(redisKey)
            .pttl(redisKey)
            .exec();

          if (result && result[0][1] !== null && result[1][1] !== null) {
            count = result[0][1] as number;
            let ttl = result[1][1] as number;

            if (ttl < 0) {
              await redis.pexpire(redisKey, windowMs);
              ttl = windowMs;
            }

            resetAt = now + ttl;
            logger.debug(
              { clientKey, count, max, ttl },
              "Redis rate limit count"
            );
          } else {
            count = 1;
            resetAt = now + windowMs;
          }
        } catch (err) {
          logger.error(
            { err, key: redisKey },
            "Redis rate limit error, falling back to memory"
          );
          ({ count, resetAt } = updateMemoryStore(
            memoryStore,
            clientKey,
            windowMs,
            now
          ));
        }
      } else {
        ({ count, resetAt } = updateMemoryStore(
          memoryStore,
          clientKey,
          windowMs,
          now
        ));
        logger.debug({ clientKey, count, max }, "Memory rate limit count");
      }

      // Set headers
      set.headers["X-RateLimit-Limit"] = String(max);
      set.headers["X-RateLimit-Remaining"] = String(Math.max(0, max - count));
      set.headers["X-RateLimit-Reset"] = String(Math.ceil(resetAt / 1000));

      if (count > max) {
        const retryAfter = Math.ceil((resetAt - now) / 1000);
        set.headers["Retry-After"] = String(retryAfter);

        logger.warn(
          { key: clientKey, count, max, retryAfter, path },
          "Rate limit exceeded"
        );

        throw new TooManyRequestsException(
          `Rate limit exceeded. Try again in ${retryAfter} seconds.`
        );
      }
    }
  );
}

function updateMemoryStore(
  store: Map<string, RateLimitEntry>,
  key: string,
  windowMs: number,
  now: number
) {
  let entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count++;
  return { count: entry.count, resetAt: entry.resetAt };
}

function getClientIP(request: Request): string {
  const headers = request.headers;
  const ip =
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    "127.0.0.1";
  return ip;
}

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  id: "auth-limiter",
  keyPrefix: "auth",
});

export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  id: "api-limiter",
  keyPrefix: "api",
});

export const testRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  id: "test-limiter",
  keyPrefix: "test",
});
