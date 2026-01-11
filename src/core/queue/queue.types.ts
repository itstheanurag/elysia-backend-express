/**
 * Queue Types
 * Type definitions for all job payloads
 */

/**
 * Email job payload
 */
export interface EmailJobPayload {
  /** Recipient email address */
  to: string;
  /** Email subject */
  subject: string;
  /** Email body (HTML or plain text) */
  body: string;
  /** Optional template name */
  template?: string;
  /** Template variables */
  templateData?: Record<string, unknown>;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * Webhook delivery job payload
 */
export interface WebhookJobPayload {
  /** Target URL */
  url: string;
  /** HTTP method */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: unknown;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * Data processing job payload
 */
export interface DataProcessingJobPayload {
  /** Processing type identifier */
  type: string;
  /** Data to process */
  data: unknown;
  /** Job priority (higher = more important) */
  priority?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * Cron/scheduled job payload
 */
export interface CronJobPayload {
  /** Job name identifier */
  name: string;
  /** Handler function identifier */
  handler: string;
  /** Job-specific data */
  data?: unknown;
  /** Request ID for tracing */
  requestId?: string;
}

/**
 * Queue names enum
 */
export const QueueNames = {
  EMAIL: "email",
  WEBHOOK: "webhook",
  DATA_PROCESSING: "data-processing",
  CRON: "cron",
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

/**
 * Job status
 */
export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "paused";

/**
 * Queue stats
 */
export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

/**
 * Default job options
 */
export const DefaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1000,
  },
  removeOnComplete: {
    count: 1000,
    age: 24 * 60 * 60, // 24 hours
  },
  removeOnFail: {
    count: 5000,
    age: 7 * 24 * 60 * 60, // 7 days
  },
};
