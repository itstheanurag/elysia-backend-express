import {
  createWorker,
  createLogger,
  type WebhookJobPayload,
  QueueNames,
  getQueueEvents,
  updateQueueGauges,
  recordQueueJob,
} from "@/core";

import { getWebhookQueue } from "../queues/webhook.queue";
import { Job } from "bullmq";

const logger = createLogger("queue:webhook-worker");

/**
 * Start webhook worker
 */
export function startWebhookWorker(concurrency?: number) {
  const worker = createWorker<WebhookJobPayload>(
    QueueNames.WEBHOOK,
    processWebhookJob,
    concurrency
  );

  if (!worker) {
    logger.warn("Webhook worker not started - queue system unavailable");
    return null;
  }

  // Set up queue events for metrics
  const events = getQueueEvents(QueueNames.WEBHOOK);
  if (events) {
    events.on("waiting", async () => {
      const queue = getWebhookQueue();
      if (queue) {
        const counts = await queue.getJobCounts();
        updateQueueGauges(QueueNames.WEBHOOK, counts);
      }
    });
  }

  logger.info({ concurrency }, "Webhook worker started");
  return worker;
}

/**
 * Process webhook job
 */
async function processWebhookJob(job: Job<WebhookJobPayload>): Promise<{
  status: number;
  success: boolean;
}> {
  const { url, method, headers, body, timeout, metadata, requestId } = job.data;
  const startTime = Date.now();

  logger.info(
    { jobId: job.id, url, method, requestId },
    "Processing webhook delivery"
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout || 30000);

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Elysia-Webhook/1.0",
        "X-Webhook-ID": job.id || "",
        "X-Request-ID": requestId || "",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;
    const success = response.ok;

    if (success) {
      recordQueueJob(QueueNames.WEBHOOK, "completed", duration);
      logger.info(
        { jobId: job.id, url, status: response.status, duration, requestId },
        "Webhook delivered successfully"
      );
    } else {
      // Non-2xx response - will retry
      const responseText = await response.text().catch(() => "");
      recordQueueJob(QueueNames.WEBHOOK, "failed");
      logger.warn(
        {
          jobId: job.id,
          url,
          status: response.status,
          responseText,
          requestId,
        },
        "Webhook delivery failed with non-2xx status"
      );
      throw new Error(`Webhook failed with status ${response.status}`);
    }

    await job.updateProgress(100);

    return { status: response.status, success };
  } catch (error) {
    recordQueueJob(QueueNames.WEBHOOK, "failed");

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(
      { jobId: job.id, url, error: errorMessage, requestId },
      "Webhook delivery failed"
    );

    throw error;
  }
}
