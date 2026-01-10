/**
 * Logger Plugin
 * High-performance async request/response logging using Pino
 *
 * Features:
 * - Non-blocking async logging
 * - JSON output for production (easily parsed by log aggregators)
 * - Pretty output for development
 * - Accurate request timing using performance.now()
 * - Error tracking
 */

import { Elysia } from "elysia";
import type { LoggerConfig } from "@config/index";
import { httpLogger } from "@core/logger";

// WeakMap to store request timing without polluting context
const requestTimings = new WeakMap<
  Request,
  { startTime: number; requestId: string }
>();

export const loggerPlugin = (config: LoggerConfig) => {
  if (!config.enabled) {
    return new Elysia({ name: "plugin-logger" });
  }

  return new Elysia({ name: "plugin-logger" })
    .derive({ as: "global" }, ({ request }) => {
      // Check if timing already exists (in case of multiple derive calls)
      let timing = requestTimings.get(request);

      if (!timing) {
        timing = {
          startTime: performance.now(),
          requestId: crypto.randomUUID(),
        };
        requestTimings.set(request, timing);
      }

      return {
        requestId: timing.requestId,
        getRequestDuration: () => performance.now() - timing.startTime,
      };
    })
    .onAfterHandle(
      { as: "global" },
      ({ request, requestId, getRequestDuration, set }) => {
        const duration = getRequestDuration?.() ?? 0;
        const url = new URL(request.url);

        // Async log - non-blocking
        httpLogger.info({
          requestId,
          method: request.method,
          path: url.pathname,
          query: url.search || undefined,
          status: set.status || 200,
          durationMs: duration,
        });

        // Cleanup
        requestTimings.delete(request);
      }
    )
    .onError(
      { as: "global" },
      ({ request, error, requestId, getRequestDuration, code }) => {
        const duration = getRequestDuration?.() ?? 0;
        const url = new URL(request.url);

        const errorMessage =
          "message" in error && typeof error.message === "string"
            ? error.message
            : "Unknown error";

        const errorStack =
          "stack" in error && typeof error.stack === "string"
            ? error.stack
            : undefined;

        // Async error log - non-blocking
        httpLogger.error({
          requestId,
          method: request.method,
          path: url.pathname,
          query: url.search || undefined,
          errorCode: code,
          error: errorMessage,
          stack: errorStack,
          durationMs: duration,
        });

        requestTimings.delete(request);
      }
    );
};
