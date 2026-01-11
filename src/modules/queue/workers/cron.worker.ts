import {
  createWorker,
  createLogger,
  type CronJobPayload,
  QueueNames,
  getQueueEvents,
  updateQueueGauges,
  recordQueueJob,
} from "@/core";

import { getCronQueue, cronHandlers } from "../queues/cron.queue";
import { Job } from "bullmq";

const logger = createLogger("queue:cron-worker");

/**
 * Start cron worker
 */
export function startCronWorker(concurrency?: number) {
  const worker = createWorker<CronJobPayload>(
    QueueNames.CRON,
    processCronJob,
    concurrency
  );

  if (!worker) {
    logger.warn("Cron worker not started - queue system unavailable");
    return null;
  }

  // Set up queue events for metrics
  const events = getQueueEvents(QueueNames.CRON);
  if (events) {
    events.on("waiting", async () => {
      const queue = getCronQueue();
      if (queue) {
        const counts = await queue.getJobCounts();
        updateQueueGauges(QueueNames.CRON, counts);
      }
    });
  }

  logger.info({ concurrency }, "Cron worker started");
  return worker;
}

/**
 * Process cron job
 */
async function processCronJob(job: Job<CronJobPayload>): Promise<unknown> {
  const { name, handler: handlerName, data, requestId } = job.data;
  const startTime = Date.now();

  logger.info({ jobId: job.id, name, requestId }, "Processing cron job");

  const handler = cronHandlers.get(handlerName);

  if (!handler) {
    recordQueueJob(QueueNames.CRON, "failed");
    logger.error({ jobId: job.id, name }, "No handler for cron job");
    throw new Error(`No handler registered for cron job: ${handlerName}`);
  }

  try {
    const result = await handler(data, job);

    const duration = Date.now() - startTime;
    recordQueueJob(QueueNames.CRON, "completed", duration);

    logger.info(
      { jobId: job.id, name, duration, requestId },
      "Cron job completed"
    );

    return result;
  } catch (error) {
    recordQueueJob(QueueNames.CRON, "failed");

    logger.error({ jobId: job.id, name, error, requestId }, "Cron job failed");

    throw error;
  }
}
