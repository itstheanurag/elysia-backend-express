/**
 * Health Check Plugin
 * Kubernetes-compatible health endpoints
 */

import { Elysia, t } from "elysia";

const healthResponse = t.Object({
  status: t.Union([t.Literal("ok"), t.Literal("degraded"), t.Literal("error")]),
  timestamp: t.String(),
  uptime: t.Number(),
  version: t.Optional(t.String()),
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
      () => {
        // Add your readiness checks here (database connection, etc.)
        const isReady = true;

        return {
          status: isReady ? ("ok" as const) : ("error" as const),
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        };
      },
      {
        detail: {
          tags: ["Health"],
          summary: "Readiness probe",
          description: "Kubernetes readiness probe endpoint",
        },
        response: healthResponse,
      }
    );
