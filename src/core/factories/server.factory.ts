/**
 * Server Factory
 * Creates fully configured Elysia server instances with graceful shutdown
 */

import { Elysia } from "elysia";
import type { AppConfig } from "@config/index";
import {
  corsPlugin,
  loggerPlugin,
  errorPlugin,
  healthPlugin,
  metricsPlugin,
  requestIdPlugin,
  bullBoardPlugin,
} from "@plugins/index";
import { logger } from "../logger";

export interface ServerFactoryOptions {
  config: AppConfig;
  name?: string;
}

export interface GracefulShutdownOptions {
  /** Timeout in ms before forcing shutdown (default: 10000) */
  timeout?: number;

  /** Custom cleanup functions to run before shutdown */
  onShutdown?: () => Promise<void> | void;

  /**
   * Handler for uncaught exceptions
   * By default: logs error and continues (server never stops)
   * Return true to shutdown, false to continue
   */
  onUncaughtException?: (error: Error) => boolean | Promise<boolean>;

  /**
   * Handler for unhandled promise rejections
   * By default: logs error and continues (server never stops)
   * Return true to shutdown, false to continue
   */
  onUnhandledRejection?: (reason: unknown) => boolean | Promise<boolean>;

  /**
   * Callback to notify admins/external services about critical errors
   * Called for uncaught exceptions and unhandled rejections
   */
  onCriticalError?: (error: {
    type: "uncaughtException" | "unhandledRejection";
    error: Error | unknown;
    timestamp: string;
  }) => Promise<void> | void;
}

/**
 * Creates a configured Elysia server with all core plugins
 *
 * @example
 * ```ts
 * const app = createServer({ config: appConfig })
 *   .use(myModule)
 *   .listen(3000);
 *
 * // Enable graceful shutdown
 * gracefulShutdown(app);
 * ```
 */
export const createServer = (options: ServerFactoryOptions) => {
  const { config, name = "elysia-app" } = options;

  return (
    new Elysia({ name })
      // Core plugins
      .use(requestIdPlugin())
      .use(corsPlugin(config.cors))
      .use(metricsPlugin(config.metrics))
      .use(loggerPlugin(config.logger))
      .use(errorPlugin())
      .use(healthPlugin())
      .use(bullBoardPlugin(config.bullBoard))
    // Note: Documentation plugin should be added AFTER all routes are registered
    // Use createDocs(config.docs) after mounting your modules
  );
};

/**
 * Sets up graceful shutdown handlers for the server
 * Handles SIGINT, SIGTERM signals and cleans up resources
 *
 * @example
 * ```ts
 * const app = createServer({ config })
 *   .listen(3000);
 *
 * gracefulShutdown(app, {
 *   timeout: 5000,
 *   onShutdown: async () => {
 *     await db.disconnect();
 *   },
 *   onCriticalError: async ({ type, error }) => {
 *     await sendSlackAlert(`Critical error: ${type}`, error);
 *   }
 * });
 * ```
 */
export const gracefulShutdown = <T extends { stop: () => unknown }>(
  app: T,
  options: GracefulShutdownOptions = {}
): T => {
  const {
    timeout = 10000,
    onShutdown,
    onUncaughtException,
    onUnhandledRejection,
    onCriticalError,
  } = options;

  let isShuttingDown = false;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn({ signal }, "Shutdown already in progress, ignoring signal");
      return;
    }

    isShuttingDown = true;
    logger.info({ signal }, "Graceful shutdown initiated");

    // Set a force-kill timeout
    const forceKillTimer = setTimeout(() => {
      logger.error("Shutdown timeout exceeded, forcing exit");
      process.exit(1);
    }, timeout);

    try {
      // Run custom cleanup
      if (onShutdown) {
        logger.info("Running custom shutdown handlers");
        await onShutdown();
      }

      // Stop the server
      logger.info("Stopping HTTP server");
      await app.stop();

      // Flush logger (pino is async)
      logger.info("Shutdown complete");

      // Small delay to ensure logs are flushed
      await new Promise((resolve) => setTimeout(resolve, 100));

      clearTimeout(forceKillTimer);
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, "Error during shutdown");
      clearTimeout(forceKillTimer);
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Handle uncaught exceptions
  process.on("uncaughtException", async (error) => {
    logger.fatal({ err: error }, "Uncaught exception");

    // Notify admins
    if (onCriticalError) {
      try {
        await onCriticalError({
          type: "uncaughtException",
          error,
          timestamp: new Date().toISOString(),
        });
      } catch (notifyError) {
        logger.error(
          { err: notifyError },
          "Failed to notify about critical error"
        );
      }
    }

    // Determine if we should shutdown (default: never shutdown, just log)
    let shouldShutdown = false;

    if (onUncaughtException) {
      shouldShutdown = await onUncaughtException(error);
    }

    if (shouldShutdown) {
      logger.warn(
        "Shutting down due to uncaught exception (custom handler requested)"
      );
      shutdown("uncaughtException");
    } else {
      logger.warn("Continuing after uncaught exception");
    }
  });

  // Handle unhandled rejections
  process.on("unhandledRejection", async (reason) => {
    logger.fatal({ err: reason }, "Unhandled rejection");

    // Notify admins
    if (onCriticalError) {
      try {
        await onCriticalError({
          type: "unhandledRejection",
          error: reason,
          timestamp: new Date().toISOString(),
        });
      } catch (notifyError) {
        logger.error(
          { err: notifyError },
          "Failed to notify about critical error"
        );
      }
    }

    // Determine if we should shutdown (default: never shutdown, just log)
    let shouldShutdown = false;

    if (onUnhandledRejection) {
      shouldShutdown = await onUnhandledRejection(reason);
    }

    if (shouldShutdown) {
      logger.warn(
        "Shutting down due to unhandled rejection (custom handler requested)"
      );
      shutdown("unhandledRejection");
    } else {
      logger.warn("Continuing after unhandled rejection");
    }
  });

  return app;
};
