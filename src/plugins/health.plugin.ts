/**
 * Health Check Plugin
 * Kubernetes-compatible health endpoints with database checks
 */

import { Elysia, t } from "elysia";
import { checkHealth as checkDbHealth, getPoolStats } from "@db/index";
import { checkRedisHealth } from "@/core/redis";

const healthResponse = t.Object({
  status: t.Union([t.Literal("ok"), t.Literal("degraded"), t.Literal("error")]),
  timestamp: t.String(),
  uptime: t.Number(),
  version: t.Optional(t.String()),
});

const readyResponse = t.Object({
  status: t.Union([t.Literal("ok"), t.Literal("degraded"), t.Literal("error")]),
  timestamp: t.String(),
  uptime: t.Number(),
  checks: t.Object({
    database: t.Object({
      connected: t.Boolean(),
      latencyMs: t.Number(),
      error: t.Optional(t.String()),
    }),
    redis: t.Object({
      connected: t.Boolean(),
      latencyMs: t.Number(),
      error: t.Optional(t.String()),
    }),
  }),
});

export const healthPlugin = () =>
  new Elysia({ name: "plugin-health", prefix: "/health" })
    .get(
      "",
      () => ({
        status: "ok" as const,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      }),
      {
        detail: {
          tags: ["Health"],
          summary: "Health check",
          description: "Basic health check endpoint",
        },
        response: healthResponse,
      }
    )
    .get(
      "/live",
      () => ({
        status: "ok" as const,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      }),
      {
        detail: {
          tags: ["Health"],
          summary: "Liveness probe",
          description: "Kubernetes liveness probe endpoint",
        },
        response: healthResponse,
      }
    )
    .get(
      "/ready",
      async () => {
        // Check database connectivity
        const dbHealth = await checkDbHealth();
        const redisHealth = await checkRedisHealth();
        const isReady = dbHealth.connected;

        return {
          status: isReady ? ("ok" as const) : ("error" as const),
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          checks: {
            database: dbHealth,
            redis: redisHealth,
          },
        };
      },
      {
        detail: {
          tags: ["Health"],
          summary: "Readiness probe",
          description:
            "Kubernetes readiness probe with database connectivity check",
        },
        response: readyResponse,
      }
    );
