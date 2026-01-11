/**
 * Queue Client
 * Central queue connection manager for BullMQ
 */

import { Queue, Worker, QueueEvents, Job } from "bullmq";
import type { ConnectionOptions, Processor } from "bullmq";
import { createLogger } from "@core/logger";
import { env } from "@config/env";
import { QueueNames, type QueueName } from "./queue.types";

const logger = createLogger("queue");

// Shared connection options
let connectionOptions: ConnectionOptions | null = null;

// Queue instances registry
const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();
const queueEvents = new Map<string, QueueEvents>();

/**
 * Get Redis connection options for queues
 */
export function getQueueConnection(): ConnectionOptions | null {
  const redisUrl = env.QUEUE_REDIS_URL || env.REDIS_URL;

  if (!redisUrl) {
    logger.warn("No Redis URL configured, queue system disabled");
    return null;
  }

  if (!connectionOptions) {
    const url = new URL(redisUrl);

    connectionOptions = {
      host: url.hostname,
      port: parseInt(url.port, 10) || 6379,
      password: url.password || undefined,
      db: url.pathname ? parseInt(url.pathname.slice(1), 10) || 0 : 0,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    };

    logger.info(
      { host: url.hostname, port: url.port },
      "Queue connection configured"
    );
  }

  return connectionOptions;
}

/**
 * Create or get a queue instance
 */
export function getQueue<T = unknown>(
  name: QueueName | string
): Queue<T> | null {
  const connection = getQueueConnection();

  if (!connection) {
    return null;
  }

  if (!queues.has(name)) {
    const queue = new Queue<T>(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 60 * 60,
        },
        removeOnFail: {
          count: 5000,
          age: 7 * 24 * 60 * 60,
        },
      },
    });

    queues.set(name, queue as Queue);
    logger.info({ queue: name }, "Queue created");
  }

  return queues.get(name) as Queue<T>;
}

/**
 * Create a worker for a queue
 */
export function createWorker<T = unknown>(
  name: QueueName | string,
  processor: Processor<T>,
  concurrency?: number
): Worker<T> | null {
  const connection = getQueueConnection();

  if (!connection) {
    return null;
  }

  if (workers.has(name)) {
    logger.warn({ queue: name }, "Worker already exists, returning existing");
    return workers.get(name) as Worker<T>;
  }

  const worker = new Worker<T>(name, processor, {
    connection,
    concurrency: concurrency || env.QUEUE_CONCURRENCY,
  });

  // Worker event handlers
  worker.on("completed", (job) => {
    logger.debug(
      { queue: name, jobId: job.id, jobName: job.name },
      "Job completed"
    );
  });

  worker.on("failed", (job, error) => {
    logger.error(
      { queue: name, jobId: job?.id, jobName: job?.name, error: error.message },
      "Job failed"
    );
  });

  worker.on("error", (error) => {
    logger.error({ queue: name, error: error.message }, "Worker error");
  });

  workers.set(name, worker as Worker);
  logger.info(
    { queue: name, concurrency: concurrency || env.QUEUE_CONCURRENCY },
    "Worker created"
  );

  return worker;
}

/**
 * Get queue events listener
 */
export function getQueueEvents(name: QueueName | string): QueueEvents | null {
  const connection = getQueueConnection();

  if (!connection) {
    return null;
  }

  if (!queueEvents.has(name)) {
    const events = new QueueEvents(name, { connection });
    queueEvents.set(name, events);
  }

  return queueEvents.get(name) || null;
}

/**
 * Get all registered queues
 */
export function getAllQueues(): Map<string, Queue> {
  return queues;
}

/**
 * Get all registered workers
 */
export function getAllWorkers(): Map<string, Worker> {
  return workers;
}

/**
 * Check queue health
 */
export async function checkQueueHealth(): Promise<{
  connected: boolean;
  queues: string[];
  workers: string[];
  error?: string;
}> {
  try {
    const connection = getQueueConnection();

    if (!connection) {
      return { connected: false, queues: [], workers: [] };
    }

    // Ping a queue to check connection
    const testQueue = getQueue(QueueNames.EMAIL);
    if (testQueue) {
      await testQueue.getJobCounts();
    }

    return {
      connected: true,
      queues: Array.from(queues.keys()),
      workers: Array.from(workers.keys()),
    };
  } catch (error) {
    return {
      connected: false,
      queues: Array.from(queues.keys()),
      workers: Array.from(workers.keys()),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Gracefully disconnect all queues and workers
 */
export async function disconnectQueues(): Promise<void> {
  logger.info("Disconnecting queue system...");

  // Close workers first
  for (const [name, worker] of workers) {
    try {
      await worker.close();
      logger.debug({ worker: name }, "Worker closed");
    } catch (error) {
      logger.error({ worker: name, error }, "Error closing worker");
    }
  }
  workers.clear();

  // Close queue events
  for (const [name, events] of queueEvents) {
    try {
      await events.close();
      logger.debug({ queueEvents: name }, "Queue events closed");
    } catch (error) {
      logger.error({ queueEvents: name, error }, "Error closing queue events");
    }
  }
  queueEvents.clear();

  // Close queues
  for (const [name, queue] of queues) {
    try {
      await queue.close();
      logger.debug({ queue: name }, "Queue closed");
    } catch (error) {
      logger.error({ queue: name, error }, "Error closing queue");
    }
  }
  queues.clear();

  connectionOptions = null;
  logger.info("Queue system disconnected");
}
