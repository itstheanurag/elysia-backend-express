/**
 * Elysia Backend Template
 * Main entry point
 */

import { createServer, gracefulShutdown, logger } from "@core/index";
import { appConfig } from "@config/app.config";
import { exampleModule } from "@modules/example";

// Create and configure the server
const app = createServer({ config: appConfig })
  // Mount feature modules under API prefix
  .group(appConfig.server.prefix, (app) => app.use(exampleModule))
  // Root endpoint
  .get("/", () => ({
    name: "Elysia Backend",
    version: "1.0.0",
    docs: appConfig.docs.enabled ? appConfig.docs.path : null,
  }));

// Start the server
app.listen(appConfig.server.port);

// Setup graceful shutdown with error handling
gracefulShutdown(app, {
  timeout: 10000,

  // Cleanup on shutdown
  onShutdown: async () => {
    // Add your cleanup logic here:
    // - Close database connections
    // - Flush queues
    // - Close external service connections
    logger.info("Running application cleanup...");
  },

  // Handle critical errors (optional - for monitoring/alerting)
  onCriticalError: async ({ type, error, timestamp }) => {
    // Send to your error tracking service:
    // - Sentry, Datadog, New Relic, etc.
    // - Slack/Discord webhook
    // - Email alert
    logger.error({ type, error, timestamp }, "Critical error occurred");

    // Example: add your custom logic to notify responsible person here
    // await fetch(process.env.SLACK_WEBHOOK_URL, {
    //   method: "POST",
    //   body: JSON.stringify({
    //     text: `${type}: ${error instanceof Error ? error.message : String(error)}`,
    //   }),
    // });
  },

  // Custom decision on whether to shutdown (optional)
  // onUncaughtException: async (error) => {
  //   // Return true to shutdown, false to continue
  //   return error.message.includes("FATAL");
  // },
});

logger.info(
  {
    host: appConfig.server.host,
    port: appConfig.server.port,
    docs: appConfig.docs.path,
    env: appConfig.isDev ? "development" : "production",
  },
  "Elysia server started"
);

export type App = typeof app;
