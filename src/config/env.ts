/**
 * Environment Configuration
 * Type-safe environment variables with validation using Elysia's TypeBox
 *
 * Server will fail to start if required variables are missing or invalid
 */

import { t } from "elysia";
import { Value } from "@sinclair/typebox/value";

const envSchema = t.Object({
  // Server
  PORT: t.Number({ default: 3000, minimum: 1, maximum: 65535 }),
  HOST: t.String({ default: "localhost" }),
  NODE_ENV: t.Union(
    [t.Literal("development"), t.Literal("production"), t.Literal("test")],
    { default: "development" }
  ),

  // Database
  DATABASE_URL: t.Optional(t.String()),

  // JWT Authentication
  JWT_SECRET: t.String({
    default: "change-me-in-production-use-secure-random-string",
  }),
  JWT_EXPIRES_IN: t.String({ default: "7d" }),

  // Redis
  REDIS_URL: t.Optional(t.String()),

  // Logging
  LOG_LEVEL: t.Union(
    [
      t.Literal("debug"),
      t.Literal("info"),
      t.Literal("warn"),
      t.Literal("error"),
    ],
    { default: "info" }
  ),

  // CORS
  CORS_ORIGIN: t.String({ default: "*" }),
  CORS_CREDENTIALS: t.Boolean({ default: false }),
  CORS_METHODS: t.String({ default: "GET,POST,PUT,DELETE,OPTIONS" }),
  CORS_ALLOWED_HEADERS: t.String({ default: "Content-Type,Authorization" }),

  // Documentation
  DOCS_ENABLED: t.Boolean({ default: true }),
  DOCS_PROVIDER: t.Union([t.Literal("scalar"), t.Literal("swaggerui")], {
    default: "scalar",
  }),
  DOCS_PATH: t.String({ default: "/docs", pattern: "^/" }),

  // API
  API_PREFIX: t.String({ default: "/api/v1", pattern: "^/" }),
});

function parseEnv(): typeof envSchema.static {
  // Convert process.env to proper types
  const rawEnv = {
    PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : undefined,
    HOST: process.env.HOST,
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    REDIS_URL: process.env.REDIS_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    CORS_CREDENTIALS:
      process.env.CORS_CREDENTIALS === "true"
        ? true
        : process.env.CORS_CREDENTIALS === "false"
        ? false
        : undefined,
    CORS_METHODS: process.env.CORS_METHODS,
    CORS_ALLOWED_HEADERS: process.env.CORS_ALLOWED_HEADERS,
    DOCS_ENABLED:
      process.env.DOCS_ENABLED === "true"
        ? true
        : process.env.DOCS_ENABLED === "false"
        ? false
        : undefined,
    DOCS_PROVIDER: process.env.DOCS_PROVIDER,
    DOCS_PATH: process.env.DOCS_PATH,
    API_PREFIX: process.env.API_PREFIX,
  };

  // Apply defaults
  const withDefaults = Value.Default(envSchema, rawEnv);

  // Validate
  const errors = [...Value.Errors(envSchema, withDefaults)];

  if (errors.length > 0) {
    console.error("\n Environment validation failed:\n");
    for (const error of errors) {
      console.error(`• ${error.path.replace("/", "")}: ${error.message}`);
    }
    console.error("\n Check your .env file or environment variables.\n");
    process.exit(1);
  }

  return withDefaults as typeof envSchema.static;
}

// ============================================================================
// Export
// ============================================================================

export const env = parseEnv();
export type Env = typeof env;
