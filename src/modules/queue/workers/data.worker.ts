import {
  createWorker,
  createLogger,
  type DataProcessingJobPayload,
  QueueNames,
  getQueueEvents,
  updateQueueGauges,
  recordQueueJob,
} from "@/core";

import { getDataQueue, dataHandlers } from "../queues/data.queue";
import { Job } from "bullmq";

const logger = createLogger("queue:data-worker");

/**
 * Start data processing worker
 */
export function startDataWorker(concurrency?: number) {
  const worker = createWorker<DataProcessingJobPayload>(
    QueueNames.DATA_PROCESSING,
    processDataJob,
    concurrency
  );

  if (!worker) {
    logger.warn("Data worker not started - queue system unavailable");
    return null;
  }

  // Set up queue events for metrics
  const events = getQueueEvents(QueueNames.DATA_PROCESSING);
  if (events) {
    events.on("waiting", async () => {
      const queue = getDataQueue();
      if (queue) {
        const counts = await queue.getJobCounts();
        updateQueueGauges(QueueNames.DATA_PROCESSING, counts);
      }
    });
  }

  logger.info({ concurrency }, "Data processing worker started");
  return worker;
}

/**
 * Process data job
 */
async function processDataJob(
  job: Job<DataProcessingJobPayload>
): Promise<unknown> {
  const { type, data, metadata, requestId } = job.data;
  const startTime = Date.now();

  logger.info({ jobId: job.id, type, requestId }, "Processing data job");

  const handler = dataHandlers.get(type);

  if (!handler) {
    recordQueueJob(QueueNames.DATA_PROCESSING, "failed");
    logger.error(
      { jobId: job.id, type },
      "No handler registered for data type"
    );
    throw new Error(`No handler registered for data type: ${type}`);
  }

  try {
    const result = await handler(data, job);

    const duration = Date.now() - startTime;
    recordQueueJob(QueueNames.DATA_PROCESSING, "completed", duration);

    logger.info(
      { jobId: job.id, type, duration, requestId },
      "Data processing completed"
    );

    return result;
  } catch (error) {
    recordQueueJob(QueueNames.DATA_PROCESSING, "failed");

    logger.error(
      { jobId: job.id, type, error, requestId },
      "Data processing failed"
    );

    throw error;
  }
}
