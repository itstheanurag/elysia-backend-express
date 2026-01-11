import {
  createWorker,
  createLogger,
  type EmailJobPayload,
  QueueNames,
  getQueueEvents,
  updateQueueGauges,
  recordQueueJob,
} from "@/core";

import { getEmailQueue } from "../queues/email.queue";
import { Job } from "bullmq";

const logger = createLogger("queue:email-worker");

/**
 * Start email worker
 */
export function startEmailWorker(concurrency?: number) {
  const worker = createWorker<EmailJobPayload>(
    QueueNames.EMAIL,
    processEmailJob,
    concurrency
  );

  if (!worker) {
    logger.warn("Email worker not started - queue system unavailable");
    return null;
  }

  // Set up queue events for metrics
  const events = getQueueEvents(QueueNames.EMAIL);
  if (events) {
    events.on("waiting", async () => {
      const queue = getEmailQueue();
      if (queue) {
        const counts = await queue.getJobCounts();
        updateQueueGauges(QueueNames.EMAIL, counts);
      }
    });
  }

  logger.info({ concurrency }, "Email worker started");
  return worker;
}

/**
 * Process email job
 * This is the actual email sending logic
 */
async function processEmailJob(
  job: Job<EmailJobPayload>
): Promise<{ sent: boolean }> {
  const { to, subject, body, template, templateData, metadata, requestId } =
    job.data;
  const startTime = Date.now();

  logger.info(
    { jobId: job.id, to, subject, requestId },
    "Processing email job"
  );

  try {
    // TODO: Replace with actual email sending logic
    // Examples:
    // - Nodemailer
    // - SendGrid
    // - AWS SES
    // - Resend
    // - Mailgun

    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update job progress
    await job.updateProgress(100);

    const duration = Date.now() - startTime;
    recordQueueJob(QueueNames.EMAIL, "completed", duration);

    logger.info(
      { jobId: job.id, to, subject, duration, requestId },
      "Email sent successfully"
    );

    return { sent: true };
  } catch (error) {
    recordQueueJob(QueueNames.EMAIL, "failed");

    logger.error(
      { jobId: job.id, to, subject, error, requestId },
      "Failed to send email"
    );

    throw error;
  }
}
