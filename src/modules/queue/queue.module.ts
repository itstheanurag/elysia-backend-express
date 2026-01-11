/**
 * Queue Module
 * REST API endpoints for queue management
 */

import { Elysia, t } from "elysia";
import {
  getAllQueueStats,
  getQueueStats,
  getQueueJobs,
  retryFailedJobs,
  cleanQueue,
  pauseQueue,
  resumeQueue,
  removeJob,
} from "./queue.service";
import { NotFoundException, BadRequestException } from "@core/exceptions";
import { QueueNames } from "@/core/queue";
import {
  addEmailJob,
  addWebhookJob,
  addDataJob,
  getScheduledCronJobs,
} from "./queues";

export const queueModule = new Elysia({
  name: "module-queue",
  prefix: "/queues",
})
  // List all queues with stats
  .get(
    "",
    async () => {
      const stats = await getAllQueueStats();
      return { queues: stats };
    },
    {
      detail: {
        tags: ["Queues"],
        summary: "List all queues",
        description: "Get statistics for all registered queues",
      },
    }
  )

  // Get specific queue stats
  .get(
    "/:name",
    async ({ params }) => {
      const stats = await getQueueStats(params.name);

      if (!stats) {
        throw new NotFoundException(`Queue "${params.name}" not found`);
      }

      return stats;
    },
    {
      params: t.Object({
        name: t.String(),
      }),
      detail: {
        tags: ["Queues"],
        summary: "Get queue stats",
        description: "Get statistics for a specific queue",
      },
    }
  )

  // Get jobs in a queue
  .get(
    "/:name/jobs",
    async ({ params, query }) => {
      const status =
        (query.status as
          | "waiting"
          | "active"
          | "completed"
          | "failed"
          | "delayed") || "waiting";
      const start = parseInt(query.start || "0", 10);
      const end = parseInt(query.end || "20", 10);

      const jobs = await getQueueJobs(params.name, status, start, end);
      return { jobs };
    },
    {
      params: t.Object({
        name: t.String(),
      }),
      query: t.Object({
        status: t.Optional(
          t.Union([
            t.Literal("waiting"),
            t.Literal("active"),
            t.Literal("completed"),
            t.Literal("failed"),
            t.Literal("delayed"),
          ])
        ),
        start: t.Optional(t.String()),
        end: t.Optional(t.String()),
      }),
      detail: {
        tags: ["Queues"],
        summary: "List jobs in queue",
        description: "Get jobs from a queue filtered by status",
      },
    }
  )

  // Add job to a queue
  .post(
    "/:name/jobs",
    async ({ params, body, request }) => {
      const { name } = params;
      const reqId = request.headers.get("x-request-id") || undefined;
      let jobId: string | null = null;

      switch (name) {
        case QueueNames.EMAIL:
          jobId = await addEmailJob({
            to: body.to || "",
            subject: body.subject || "",
            body: body.body || "",
            template: body.template,
            templateData: body.templateData,
            metadata: body.metadata,
            requestId: reqId,
          });
          break;

        case QueueNames.WEBHOOK:
          jobId = await addWebhookJob({
            url: body.url || "",
            method:
              (body.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE") ||
              "POST",
            headers: body.headers,
            body: body.payload,
            timeout: body.timeout,
            metadata: body.metadata,
            requestId: reqId,
          });
          break;

        case QueueNames.DATA_PROCESSING:
          jobId = await addDataJob({
            type: body.type || "",
            data: body.data,
            priority: body.priority,
            metadata: body.metadata,
            requestId: reqId,
          });
          break;

        default:
          throw new BadRequestException(
            `Cannot add jobs to queue "${name}" via API`
          );
      }

      if (!jobId) {
        throw new BadRequestException(
          "Failed to add job - queue system may be unavailable"
        );
      }

      return { jobId, queue: name };
    },
    {
      params: t.Object({
        name: t.String(),
      }),
      body: t.Object({
        // Email fields
        to: t.Optional(t.String()),
        subject: t.Optional(t.String()),
        body: t.Optional(t.String()),
        template: t.Optional(t.String()),
        templateData: t.Optional(t.Record(t.String(), t.Unknown())),
        // Webhook fields
        url: t.Optional(t.String()),
        method: t.Optional(t.String()),
        headers: t.Optional(t.Record(t.String(), t.String())),
        payload: t.Optional(t.Unknown()),
        timeout: t.Optional(t.Number()),
        // Data processing fields
        type: t.Optional(t.String()),
        data: t.Optional(t.Unknown()),
        priority: t.Optional(t.Number()),
        // Common
        metadata: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
      detail: {
        tags: ["Queues"],
        summary: "Add job to queue",
        description: "Add a new job to a queue",
      },
    }
  )

  // Remove a job
  .delete(
    "/:name/jobs/:jobId",
    async ({ params }) => {
      const removed = await removeJob(params.name, params.jobId);

      if (!removed) {
        throw new NotFoundException(
          `Job "${params.jobId}" not found in queue "${params.name}"`
        );
      }

      return { removed: true };
    },
    {
      params: t.Object({
        name: t.String(),
        jobId: t.String(),
      }),
      detail: {
        tags: ["Queues"],
        summary: "Remove job",
        description: "Remove a specific job from a queue",
      },
    }
  )

  // Retry failed jobs
  .post(
    "/:name/retry-failed",
    async ({ params }) => {
      const retried = await retryFailedJobs(params.name);
      return { retried };
    },
    {
      params: t.Object({
        name: t.String(),
      }),
      detail: {
        tags: ["Queues"],
        summary: "Retry failed jobs",
        description: "Retry all failed jobs in a queue",
      },
    }
  )

  // Clean old jobs
  .post(
    "/:name/clean",
    async ({ params, body }) => {
      const status = body.status || "completed";
      const olderThanMs = body.olderThanMs || 24 * 60 * 60 * 1000;

      const cleaned = await cleanQueue(params.name, status, olderThanMs);
      return { cleaned };
    },
    {
      params: t.Object({
        name: t.String(),
      }),
      body: t.Object({
        status: t.Optional(
          t.Union([t.Literal("completed"), t.Literal("failed")])
        ),
        olderThanMs: t.Optional(t.Number()),
      }),
      detail: {
        tags: ["Queues"],
        summary: "Clean queue",
        description: "Remove old completed or failed jobs from a queue",
      },
    }
  )

  // Pause queue
  .post(
    "/:name/pause",
    async ({ params }) => {
      const paused = await pauseQueue(params.name);

      if (!paused) {
        throw new NotFoundException(`Queue "${params.name}" not found`);
      }

      return { paused: true };
    },
    {
      params: t.Object({
        name: t.String(),
      }),
      detail: {
        tags: ["Queues"],
        summary: "Pause queue",
        description: "Pause processing of a queue",
      },
    }
  )

  // Resume queue
  .post(
    "/:name/resume",
    async ({ params }) => {
      const resumed = await resumeQueue(params.name);

      if (!resumed) {
        throw new NotFoundException(`Queue "${params.name}" not found`);
      }

      return { resumed: true };
    },
    {
      params: t.Object({
        name: t.String(),
      }),
      detail: {
        tags: ["Queues"],
        summary: "Resume queue",
        description: "Resume processing of a paused queue",
      },
    }
  )

  // Get scheduled cron jobs
  .get(
    "/cron/scheduled",
    async () => {
      const jobs = await getScheduledCronJobs();
      return { scheduledJobs: jobs };
    },
    {
      detail: {
        tags: ["Queues"],
        summary: "List scheduled cron jobs",
        description: "Get all scheduled cron/repeating jobs",
      },
    }
  );
