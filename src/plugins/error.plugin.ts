/**
 * Error Handling Plugin
 * Global error handling with consistent response format
 *
 * Supports custom HttpException classes for typed errors
 */

import { Elysia } from "elysia";
import { HttpException } from "@core/exceptions";

export interface ErrorResponse {
  message: string;
  code: string;
  statusCode: number;
  timestamp: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export const errorPlugin = () =>
  new Elysia({ name: "plugin-error" }).onError(
    { as: "global" },
    ({ error, set, code }): ErrorResponse => {
      // Handle our custom HttpException
      if (error instanceof HttpException) {
        set.status = error.statusCode;

        const response: ErrorResponse = {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          timestamp: error.timestamp,
        };

        if (error.details) {
          response.details = error.details;
        }

        if (error.includeStack) {
          response.stack = error.stack;
        }

        return response;
      }

      // Handle Elysia built-in errors
      let statusCode = 500;
      let errorCode = "INTERNAL_ERROR";

      if ("status" in error && typeof error.status === "number") {
        statusCode = error.status;
      } else if (code === "NOT_FOUND") {
        statusCode = 404;
        errorCode = "NOT_FOUND";
      } else if (code === "VALIDATION") {
        statusCode = 400;
        errorCode = "VALIDATION_ERROR";
      } else if (code === "PARSE") {
        statusCode = 400;
        errorCode = "PARSE_ERROR";
      } else if (code) {
        errorCode = String(code);
      }

      set.status = statusCode;

      // Extract message safely
      const message =
        "message" in error && typeof error.message === "string"
          ? error.message
          : "Internal Server Error";

      // Extract stack safely
      const stack =
        "stack" in error && typeof error.stack === "string"
          ? error.stack
          : undefined;

      const response: ErrorResponse = {
        message,
        code: errorCode,
        statusCode,
        timestamp: new Date().toISOString(),
      };

      // Note: Stack traces are logged server-side by the logger plugin.
      // We don't include them in the JSON response by default to keep it clean.

      return response;
    }
  );
