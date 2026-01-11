/**
 * Application Configuration
 * Centralized configuration object built from environment variables
 */

import { AppConfig } from ".";
import { env } from "./env";

export const appConfig: AppConfig = {
  server: {
    port: env.PORT,
    host: env.HOST,
    prefix: env.API_PREFIX,
  },

  database: {
    url: env.DATABASE_URL,
    enabled: !!env.DATABASE_URL,
  },

  docs: {
    enabled: env.DOCS_ENABLED,
    provider: (process.env.DOCS_PROVIDER || "scalar") as "scalar" | "swaggerui",
    path: env.DOCS_PATH,
    title: "API Documentation",
    version: "1.0.0",
    description: "Elysia API powered by Bun",
    tags: [
      { name: "Health", description: "Health check endpoints" },
      { name: "Authentication", description: "User authentication endpoints" },
      { name: "Users", description: "User management endpoints" },
      { name: "Queues", description: "Job queue management endpoints" },
      { name: "Examples", description: "Example endpoints" },
    ],
  },

  cors: {
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
    credentials: env.CORS_CREDENTIALS,
    methods: env.CORS_METHODS.split(","),
    allowedHeaders: env.CORS_ALLOWED_HEADERS.split(","),
  },

  logger: {
    level: env.LOG_LEVEL,
    enabled: true,
  },

  queue: {
    redisUrl: env.QUEUE_REDIS_URL || env.REDIS_URL,
    concurrency: env.QUEUE_CONCURRENCY,
    enabled: env.QUEUE_ENABLED && !!(env.QUEUE_REDIS_URL || env.REDIS_URL),
  },

  bullBoard: {
    enabled: env.BULL_BOARD_ENABLED,
    path: env.BULL_BOARD_PATH,
    username: env.BULL_BOARD_USERNAME,
    password: env.BULL_BOARD_PASSWORD,
  },

  isDev: env.NODE_ENV === "development",
  isProd: env.NODE_ENV === "production",
};
