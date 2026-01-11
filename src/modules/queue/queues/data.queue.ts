/**
 * Data Processing Queue
 * Producer for generic data processing jobs
 */

import {
  createWorker,
  DataProcessingJobPayload,
  DefaultJobOptions,
  getQueue,
  getQueueEvents,
  QueueNames,
  recordQueueJob,
  updateQueueGauges,
} from "@/core/queue";
import { createLogger } from "@core/logger";
import type { Job } from "bullmq";

const logger = createLogger("queue:data");

/**
 * Data processing queue instance
 */
export function getDataQueue() {
  return getQueue<DataProcessingJobPayload>(QueueNames.DATA_PROCESSING);
}

/**
 * Add a data processing job
 */
export async function addDataJob(
  payload: DataProcessingJobPayload,
  options?: {
    priority?: number;
    delay?: number;
    jobId?: string;
  }
): Promise<string | null> {
  const queue = getDataQueue();

  if (!queue) {
    logger.warn("Data processing queue not available");
    return null;
  }

  const job = await queue.add(`process-${payload.type}`, payload, {
    ...DefaultJobOptions,
    priority: options?.priority || payload.priority,
    delay: options?.delay,
    jobId: options?.jobId,
  });

  logger.info(
    { jobId: job.id, type: payload.type },
    "Data processing job queued"
  );

  return job.id || null;
}

/**
 * Data processing handlers registry
 */
type DataHandler = (
  data: unknown,
  job: Job<DataProcessingJobPayload>
) => Promise<unknown>;
export const dataHandlers = new Map<string, DataHandler>();

/**
 * Register a data processing handler
 */
export function registerDataHandler(type: string, handler: DataHandler): void {
  dataHandlers.set(type, handler);
  logger.info({ type }, "Data handler registered");
}

// ============================================================================
// Built-in Data Handlers
// ============================================================================

// Example: User data export handler
registerDataHandler("example-export", async (data, job) => {
  logger.info({ data }, "Running example export handler");

  // Simulate work
  await job.updateProgress(25);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await job.updateProgress(50);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await job.updateProgress(75);
  await new Promise((resolve) => setTimeout(resolve, 100));
  await job.updateProgress(100);

  return { success: true, processed: 1 };
});
