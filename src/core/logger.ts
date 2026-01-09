/**
 * Logger Utility
 * High-performance async logger using Pino
 *
 * Features:
 * - Async by default (non-blocking)
 * - JSON logging for production
 * - Pretty printing for development
 * - Child loggers for module context
 * - Event tracking support
 */

import pino from "pino";
import { env } from "@config/env";

// Map our log levels to pino levels
const LOG_LEVEL_MAP = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
} as const;

// Create base pino instance
const createBaseLogger = () => {
  const isDev = env.NODE_ENV === "development";

  // Use pino-pretty transport in development, JSON in production
  const transport = isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined;

  return pino({
    level: LOG_LEVEL_MAP[env.LOG_LEVEL] || "info",
    transport,
    // Custom serializers for common objects
    serializers: {
      err: pino.stdSerializers.err,
      req: (req) => ({
        method: req.method,
        url: req.url,
        headers: req.headers,
      }),
      res: (res) => ({
        statusCode: res.status,
      }),
    },
    // Base context
    base: {
      env: env.NODE_ENV,
    },
  });
};

// Singleton logger instance
const baseLogger = createBaseLogger();

/**
 * Application Logger
 * Use this for general application logging
 */
export const logger = baseLogger;

/**
 * Create a child logger with module context
 * Use this in your modules to add context to logs
 *
 * @example
 * ```ts
 * const log = createLogger('user-service');
 * log.info({ userId: 123 }, 'User created');
 * log.error({ err }, 'Failed to create user');
 * ```
 */
export const createLogger = (module: string) => {
  return baseLogger.child({ module });
};

/**
 * HTTP Request Logger
 * Specifically for logging HTTP requests/responses
 */
export const httpLogger = baseLogger.child({ type: "http" });

/**
 * Event Logger
 * For tracking business events and metrics
 *
 * @example
 * ```ts
 * eventLogger.info({
 *   event: 'user.signup',
 *   userId: user.id,
 *   plan: 'free'
 * });
 * ```
 */
export const eventLogger = baseLogger.child({ type: "event" });

/**
 * Log an event with structured data
 * Convenience function for event tracking
 *
 * @example
 * ```ts
 * logEvent('order.completed', { orderId: '123', amount: 99.99 });
 * ```
 */
export const logEvent = (
  event: string,
  data?: Record<string, unknown>,
  level: "info" | "debug" = "info"
) => {
  eventLogger[level]({ event, ...data });
};

/**
 * Log an error with context
 * Convenience function for error logging
 *
 * @example
 * ```ts
 * logError('user.create_failed', error, { userId: '123' });
 * ```
 */
export const logError = (
  operation: string,
  error: Error | unknown,
  context?: Record<string, unknown>
) => {
  eventLogger.error({
    operation,
    err: error instanceof Error ? error : new Error(String(error)),
    ...context,
  });
};

// Export type for child logger
export type Logger = typeof logger;
