/**
 * Elysia Backend Template
 * Main entry point
 */

import {
  createServer,
  gracefulShutdown,
  logger,
  createDocs,
} from "@core/index";
import { appConfig } from "@config/app.config";
import { exampleModule } from "@modules/example";
import { authModule } from "@modules/auth";
import { userModule } from "@modules/user";
import { disconnect as disconnectDb } from "@db/index";
import { disconnectRedis } from "@core/redis";

// Create and configure the server
const app = createServer({ config: appConfig })
  .use(createDocs(appConfig.docs))
  .group(appConfig.server.prefix, (app) =>
    app.use(authModule).use(userModule).use(exampleModule)
  )
  .get("/", () => ({
    name: "Elysia Backend",
    version: "1.0.0",
    docs: appConfig.docs.enabled ? appConfig.docs.path : null,
  }));

app.listen(appConfig.server.port);

gracefulShutdown(app, {
  timeout: 10000,

  onShutdown: async () => {
    logger.info("Running application cleanup...");

    // cleanup logic here
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
    env: appConfig.isDev ? "development" : "production",
  },
  "Elysia server started"
);

export type App = typeof app;
