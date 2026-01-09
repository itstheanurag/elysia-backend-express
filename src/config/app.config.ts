/**
 * Application Configuration
 * Centralized configuration object built from environment variables
 */

import { env } from "./env";

export interface ServerConfig {
  port: number;
  host: string;
  prefix: string;
}

export interface DocsConfig {
  enabled: boolean;
  provider: "scalar" | "swaggerui";
  path: string;
  title: string;
  version: string;
  description: string;
}

export interface CorsConfig {
  origin: string | string[] | boolean;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
}

export interface LoggerConfig {
  level: "debug" | "info" | "warn" | "error";
  enabled: boolean;
}

export interface AppConfig {
  server: ServerConfig;
  docs: DocsConfig;
  cors: CorsConfig;
  logger: LoggerConfig;
  isDev: boolean;
  isProd: boolean;
}

export const appConfig: AppConfig = {
  server: {
    port: env.PORT,
    host: env.HOST,
    prefix: env.API_PREFIX,
  },

  docs: {
    enabled: env.DOCS_ENABLED,
    provider: (process.env.DOCS_PROVIDER || "scalar") as "scalar" | "swaggerui",
    path: env.DOCS_PATH,
    title: "API Documentation",
    version: "1.0.0",
    description: "Elysia API powered by Bun",
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
