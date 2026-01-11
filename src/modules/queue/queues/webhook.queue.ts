/**
 * Webhook Queue
 * Producer for delivering webhooks via background jobs
 */

import {
  QueueNames,
  DefaultJobOptions,
  WebhookJobPayload,
  createWorker,
  getQueue,
  getQueueEvents,
  recordQueueJob,
  updateQueueGauges,
} from "@/core/queue";
import { createLogger } from "@core/logger";
import type { Job } from "bullmq";

const logger = createLogger("queue:webhook");

/**
 * Webhook queue instance
 */
export function getWebhookQueue() {
  return getQueue<WebhookJobPayload>(QueueNames.WEBHOOK);
}

/**
 * Add a webhook delivery job
 */
export async function addWebhookJob(
  payload: WebhookJobPayload,
  options?: {
    priority?: number;
    delay?: number;
    jobId?: string;
  }
): Promise<string | null> {
  const queue = getWebhookQueue();

  if (!queue) {
    logger.warn("Webhook queue not available");
    return null;
  }

  const job = await queue.add("deliver-webhook", payload, {
    ...DefaultJobOptions,
    // More aggressive retry for webhooks
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 5000, // Start with 5 seconds
    },
    priority: options?.priority,
    delay: options?.delay,
    jobId: options?.jobId,
  });

  logger.info(
    { jobId: job.id, url: payload.url, method: payload.method },
    "Webhook job queued"
  );

  return job.id || null;
}
