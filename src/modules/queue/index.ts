/**
 * Queue Module Index
 * Exports for the queue system
 */

// Module (API routes)
export { queueModule } from "./queue.module";

// Service
export {
  getAllQueueStats,
  getQueueStats,
  getQueueJobs,
  retryFailedJobs,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  removeJob,
} from "./queue.service";

// Queues
export { getEmailQueue, addEmailJob } from "./queues/email.queue";
export { getWebhookQueue, addWebhookJob } from "./queues/webhook.queue";
export {
  getDataQueue,
  addDataJob,
  registerDataHandler,
} from "./queues/data.queue";

export {
  getCronQueue,
  registerCronHandler,
  scheduleCronJob,
  removeCronJob,
  getScheduledCronJobs,
} from "./queues/cron.queue";

// Workers
export { startEmailWorker } from "./workers/email.worker";
export { startWebhookWorker } from "./workers/webhook.worker";
export { startDataWorker } from "./workers/data.worker";
export { startCronWorker } from "./workers/cron.worker";

// Core queue client
export {
  getQueue,
  createWorker,
  getQueueEvents,
  getAllQueues,
  getAllWorkers,
  checkQueueHealth,
  disconnectQueues,
} from "@/core/queue/queue.client";

// Types
export * from "@/core/queue/queue.types";

import { createLogger } from "@core/logger";
import { startEmailWorker } from "./workers/email.worker";
import { startWebhookWorker } from "./workers/webhook.worker";
import { startDataWorker } from "./workers/data.worker";
import { startCronWorker } from "./workers/cron.worker";
import { scheduleCronJob } from "./queues/cron.queue";
import { env } from "@config/env";

const logger = createLogger("queue");

/**
 * Start all queue workers
 * Call this in your application entry point
 */
export function startWorkers(): void {
  if (!env.QUEUE_ENABLED) {
    logger.info("Queue system disabled");
    return;
  }

  const redisUrl = env.QUEUE_REDIS_URL || env.REDIS_URL;
  if (!redisUrl) {
    logger.warn("No Redis URL configured, queue workers not started");
    return;
  }

  logger.info("Starting queue workers...");

  startEmailWorker();
  startWebhookWorker();
  startDataWorker();
  startCronWorker();

  // Schedule default cron jobs
  scheduleDefaultCronJobs();

  logger.info("All queue workers started");
}

/**
 * Schedule default cron jobs
 */
async function scheduleDefaultCronJobs(): Promise<void> {
  try {
    // System health check every 5 minutes
    await scheduleCronJob("system-health-check", {
      every: 5 * 60 * 1000, // 5 minutes
    });

    // Cleanup old completed jobs daily at 3 AM
    await scheduleCronJob("cleanup-completed-jobs", {
      pattern: "0 3 * * *",
    });

    logger.info("Default cron jobs scheduled");
  } catch (error) {
    logger.error({ error }, "Failed to schedule default cron jobs");
  }
}
