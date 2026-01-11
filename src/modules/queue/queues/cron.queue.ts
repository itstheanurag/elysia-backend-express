/**
 * Cron Queue
 * Scheduled/repeating jobs using BullMQ's repeat functionality
 */

import { getQueue } from "@/core/queue/queue.client";
import { QueueNames, type CronJobPayload } from "@/core/queue";
import { createLogger } from "@core/logger";
import type { Job, RepeatableJob, RepeatOptions } from "bullmq";

const logger = createLogger("queue:cron");

/**
 * Cron queue instance
 */
export function getCronQueue() {
  return getQueue<CronJobPayload>(QueueNames.CRON);
}

/**
 * Cron job handlers registry
 */
type CronHandler = (
  data: unknown,
  job: Job<CronJobPayload>
) => Promise<unknown>;

export const cronHandlers = new Map<string, CronHandler>();

/**
 * Register a cron job handler
 *
 * @example
 * ```ts
 * registerCronHandler('cleanup-expired-tokens', async (data, job) => {
 *   const deleted = await tokenRepository.deleteExpired();
 *   return { deletedCount: deleted };
 * });
 * ```
 */
export function registerCronHandler(name: string, handler: CronHandler): void {
  cronHandlers.set(name, handler);
  logger.info({ name }, "Cron handler registered");
}

/**
 * Schedule a cron job
 *
 * @example
 * ```ts
 * // Run every hour
 * await scheduleCronJob('cleanup-expired-tokens', { every: 60 * 60 * 1000 });
 *
 * // Run daily at midnight using cron expression
 * await scheduleCronJob('daily-report', { pattern: '0 0 * * *' });
 *
 * // Run every 5 minutes
 * await scheduleCronJob('health-check', { every: 5 * 60 * 1000 });
 * ```
 */
export async function scheduleCronJob(
  name: string,
  schedule: {
    /** Repeat every X milliseconds */
    every?: number;
    /** Cron pattern (e.g., '0 0 * * *' for daily at midnight) */
    pattern?: string;
    /** Timezone for cron pattern */
    tz?: string;
    /** Limit number of times to repeat */
    limit?: number;
  },
  data?: unknown
): Promise<string | null> {
  const queue = getCronQueue();

  if (!queue) {
    logger.warn("Cron queue not available");
    return null;
  }

  const handler = cronHandlers.get(name);
  if (!handler) {
    logger.warn(
      { name },
      "No handler registered for cron job, skipping schedule"
    );
    return null;
  }

  const payload: CronJobPayload = {
    name,
    handler: name,
    data,
  };

  const repeatOptions: RepeatOptions = {};

  if (schedule.every) {
    repeatOptions.every = schedule.every;
  }

  if (schedule.pattern) {
    repeatOptions.pattern = schedule.pattern;
  }

  if (schedule.tz) {
    repeatOptions.tz = schedule.tz;
  }

  if (schedule.limit) {
    repeatOptions.limit = schedule.limit;
  }

  const job = await queue.add(name, payload, {
    repeat: repeatOptions,
    removeOnComplete: { count: 100, age: 24 * 60 * 60 },
    removeOnFail: { count: 500, age: 7 * 24 * 60 * 60 },
  });

  logger.info({ jobId: job.id, name, schedule }, "Cron job scheduled");

  return job.id || null;
}

/**
 * Remove a scheduled cron job
 */
export async function removeCronJob(name: string): Promise<boolean> {
  const queue = getCronQueue();

  if (!queue) {
    return false;
  }

  try {
    await queue.removeJobScheduler(name);
    logger.info({ name }, "Cron job scheduler removed");
    return true;
  } catch (error) {
    logger.error({ name, error }, "Failed to remove cron job scheduler");
    return false;
  }
}

/**
 * Get all scheduled cron jobs
 */
export async function getScheduledCronJobs(): Promise<
  Array<{ name: string; next: Date | null; cron?: string; every?: number }>
> {
  const queue = getCronQueue();

  if (!queue) {
    return [];
  }

  const schedulers = await queue.getJobSchedulers();

  return schedulers.map((scheduler) => ({
    name: scheduler.name || "unknown",
    next: scheduler.next ? new Date(scheduler.next) : null,
    cron: scheduler.pattern || undefined,
    every: typeof scheduler.every === "number" ? scheduler.every : undefined,
  }));
}

// Example: Cleanup old completed jobs
registerCronHandler("cleanup-completed-jobs", async (_data, _job) => {
  logger.info("Running cleanup of old completed jobs");

  // This is handled automatically by removeOnComplete settings,
  // but you could add additional cleanup logic here

  return { success: true };
});

// Example: Health check ping
registerCronHandler("system-health-check", async (_data, _job) => {
  const memUsage = process.memoryUsage();

  logger.info(
    {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      uptime: Math.round(process.uptime()),
    },
    "System health check completed"
  );

  return {
    healthy: true,
    memory: {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
    },
    uptime: process.uptime(),
  };
});
