/**
 * Email Queue
 * Producer for sending emails via background jobs
 */

import {
  createWorker,
  DefaultJobOptions,
  EmailJobPayload,
  getQueue,
  getQueueEvents,
  QueueNames,
  recordQueueJob,
  updateQueueGauges,
} from "@/core/queue";
import { createLogger } from "@core/logger";
import type { Job } from "bullmq";

const logger = createLogger("queue:email");

/**
 * Email queue instance
 */
export function getEmailQueue() {
  return getQueue<EmailJobPayload>(QueueNames.EMAIL);
}

/**
 * Add an email job to the queue
 */
export async function addEmailJob(
  payload: EmailJobPayload,
  options?: {
    priority?: number;
    delay?: number;
    jobId?: string;
  }
): Promise<string | null> {
  const queue = getEmailQueue();

  if (!queue) {
    logger.warn("Email queue not available, email not queued");
    return null;
  }

  const job = await queue.add("send-email", payload, {
    ...DefaultJobOptions,
    priority: options?.priority,
    delay: options?.delay,
    jobId: options?.jobId,
  });

  logger.info(
    { jobId: job.id, to: payload.to, subject: payload.subject },
    "Email job queued"
  );

  return job.id || null;
}
