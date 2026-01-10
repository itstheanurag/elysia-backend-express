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

  isDev: env.NODE_ENV === "development",
  isProd: env.NODE_ENV === "production",
};
