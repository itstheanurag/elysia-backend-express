/**
 * Queue Service
 * High-level service for queue management
 */
import { getAllQueues } from "@/core/queue";
import { type QueueStats, updateQueueGauges } from "@/core/queue";
import { createLogger } from "@core/logger";
import type { Job } from "bullmq";

const logger = createLogger("queue:service");

/**
 * Get stats for all queues
 */
export async function getAllQueueStats(): Promise<QueueStats[]> {
  const queues = getAllQueues();
  const stats: QueueStats[] = [];

  for (const [name, queue] of queues) {
    try {
      const counts = await queue.getJobCounts();

      const queueStats: QueueStats = {
        name,
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        paused: counts.paused || 0,
      };

      stats.push(queueStats);

      // Update Prometheus gauges
      updateQueueGauges(name, queueStats);
    } catch (error) {
      logger.error({ queue: name, error }, "Failed to get queue stats");
      stats.push({
        name,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
      });
    }
  }

  return stats;
}

/**
 * Get stats for a specific queue
 */
export async function getQueueStats(name: string): Promise<QueueStats | null> {
  const queues = getAllQueues();
  const queue = queues.get(name);

  if (!queue) {
    return null;
  }

  try {
    const counts = await queue.getJobCounts();

    return {
      name,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: counts.paused || 0,
    };
  } catch (error) {
    logger.error({ queue: name, error }, "Failed to get queue stats");
    return null;
  }
}

/**
 * Get jobs from a queue
 */
export async function getQueueJobs(
  name: string,
  status: "waiting" | "active" | "completed" | "failed" | "delayed",
  start = 0,
  end = 20
) {
  const queues = getAllQueues();
  const queue = queues.get(name);

  if (!queue) {
    return [];
  }

  try {
    const jobs = await queue.getJobs([status], start, end);

    return jobs.map((job: Job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    }));
  } catch (error) {
    logger.error({ queue: name, error }, "Failed to get queue jobs");
    return [];
  }
}

/**
 * Retry all failed jobs in a queue
 */
export async function retryFailedJobs(name: string): Promise<number> {
  const queues = getAllQueues();
  const queue = queues.get(name);

  if (!queue) {
    return 0;
  }

  try {
    const failedJobs = await queue.getJobs(["failed"]);
    let retried = 0;

    for (const job of failedJobs) {
      await job.retry();
      retried++;
    }

    logger.info({ queue: name, retried }, "Retried failed jobs");
    return retried;
  } catch (error) {
    logger.error({ queue: name, error }, "Failed to retry jobs");
    return 0;
  }
}

/**
 * Clean old jobs from a queue
 */
export async function cleanQueue(
  name: string,
  status: "completed" | "failed" = "completed",
  olderThanMs = 24 * 60 * 60 * 1000 // 24 hours
): Promise<number> {
  const queues = getAllQueues();
  const queue = queues.get(name);

  if (!queue) {
    return 0;
  }

  try {
    const removed = await queue.clean(olderThanMs, 1000, status);
    logger.info(
      { queue: name, removed: removed.length, status },
      "Cleaned queue"
    );
    return removed.length;
  } catch (error) {
    logger.error({ queue: name, error }, "Failed to clean queue");
    return 0;
  }
}

/**
 * Pause a queue
 */
export async function pauseQueue(name: string): Promise<boolean> {
  const queues = getAllQueues();
  const queue = queues.get(name);

  if (!queue) {
    return false;
  }

  try {
    await queue.pause();
    logger.info({ queue: name }, "Queue paused");
    return true;
  } catch (error) {
    logger.error({ queue: name, error }, "Failed to pause queue");
    return false;
  }
}

/**
 * Resume a queue
 */
export async function resumeQueue(name: string): Promise<boolean> {
  const queues = getAllQueues();
  const queue = queues.get(name);

  if (!queue) {
    return false;
  }

  try {
    await queue.resume();
    logger.info({ queue: name }, "Queue resumed");
    return true;
  } catch (error) {
    logger.error({ queue: name, error }, "Failed to resume queue");
    return false;
  }
}

/**
 * Remove a specific job
 */
export async function removeJob(name: string, jobId: string): Promise<boolean> {
  const queues = getAllQueues();
  const queue = queues.get(name);

  if (!queue) {
    return false;
  }

  try {
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info({ queue: name, jobId }, "Job removed");
      return true;
    }
    return false;
  } catch (error) {
    logger.error({ queue: name, jobId, error }, "Failed to remove job");
    return false;
  }
}
