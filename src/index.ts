/**
 * Elysia Backend Template
 * Main entry point
 */

import { logger, createDocs } from "@core/index";
import { createServer, gracefulShutdown } from "@core/server";
import { appConfig } from "@config/app.config";
import { exampleModule } from "@modules/example";
import { authModule } from "@modules/auth";
import { userModule } from "@modules/user";
import { queueModule, startWorkers, disconnectQueues } from "@modules/queue";
import { disconnect as disconnectDb } from "@db/index";
import { disconnectRedis } from "@core/redis";

// Create and configure the server
const app = createServer({ config: appConfig })
  .use(createDocs(appConfig.docs))
  .group(appConfig.server.prefix, (app) =>
    app.use(authModule).use(userModule).use(exampleModule).use(queueModule)
  )
  .get("/", () => ({
    name: "Elysia Backend",
    version: "1.0.0",
    docs: appConfig.docs.enabled ? appConfig.docs.path : null,
    queues: appConfig.queue.enabled
      ? `${appConfig.server.prefix}/queues`
      : null,
  }));

if (appConfig.queue.enabled) {
  startWorkers();
}

app.listen(appConfig.server.port);

gracefulShutdown(app, {
  timeout: 10000,

  onShutdown: async () => {
    logger.info("Running application cleanup...");

    // cleanup logic here
    await disconnectQueues();
    await disconnectDb();
    await disconnectRedis();
  },

  // Handle critical errors (optional - for monitoring/alerting)
  onCriticalError: async ({ type, error, timestamp }) => {
    // Send to your error tracking service:
    // - Sentry, Datadog, New Relic, etc.
    // - Slack/Discord webhook
    // - Email alert
    logger.error({ type, error, timestamp }, "Critical error occurred");
  },
});

logger.info(
  {
    host: appConfig.server.host,
    port: appConfig.server.port,
    docs: appConfig.docs.path,
    queues: appConfig.queue.enabled ? "enabled" : "disabled",
    bullBoard: appConfig.bullBoard.enabled
      ? appConfig.bullBoard.path
      : "disabled",
    env: appConfig.isDev ? "development" : "production",
  },
  "Elysia server started"
);

export type App = typeof app;
