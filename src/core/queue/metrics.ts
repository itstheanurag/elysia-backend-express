/**
 * Prometheus Metrics
 * Application metrics for monitoring with Prometheus + Grafana
 */

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from "prom-client";
import { createLogger } from "@core/logger";

const logger = createLogger("metrics");

// Create a custom registry
export const metricsRegistry = new Registry();

// Add default Node.js metrics (memory, CPU, event loop, etc.)
collectDefaultMetrics({
  register: metricsRegistry,
  prefix: "nodejs_",
});

/**
 * Total HTTP requests counter
 */
export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "path", "status"] as const,
  registers: [metricsRegistry],
});

/**
 * HTTP request duration histogram
 */
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "path", "status"] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

/**
 * Active HTTP connections gauge
 */
export const httpActiveConnections = new Gauge({
  name: "http_active_connections",
  help: "Number of active HTTP connections",
  registers: [metricsRegistry],
});

// Queue Metrics

/**
 * Total queue jobs counter
 */
export const queueJobsTotal = new Counter({
  name: "queue_jobs_total",
  help: "Total number of queue jobs",
  labelNames: ["queue", "status"] as const,
  registers: [metricsRegistry],
});

/**
 * Queue job duration histogram
 */
export const queueJobDuration = new Histogram({
  name: "queue_job_duration_seconds",
  help: "Duration of queue jobs in seconds",
  labelNames: ["queue"] as const,
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300],
  registers: [metricsRegistry],
});

/**
 * Waiting jobs gauge
 */
export const queueJobsWaiting = new Gauge({
  name: "queue_jobs_waiting",
  help: "Number of jobs waiting in queue",
  labelNames: ["queue"] as const,
  registers: [metricsRegistry],
});

/**
 * Active jobs gauge
 */
export const queueJobsActive = new Gauge({
  name: "queue_jobs_active",
  help: "Number of active jobs in queue",
  labelNames: ["queue"] as const,
  registers: [metricsRegistry],
});

/**
 * Failed jobs gauge
 */
export const queueJobsFailed = new Gauge({
  name: "queue_jobs_failed",
  help: "Number of failed jobs in queue",
  labelNames: ["queue"] as const,
  registers: [metricsRegistry],
});

/**
 * Delayed jobs gauge
 */
export const queueJobsDelayed = new Gauge({
  name: "queue_jobs_delayed",
  help: "Number of delayed jobs in queue",
  labelNames: ["queue"] as const,
  registers: [metricsRegistry],
});

// Application Metrics

/**
 * Application uptime gauge
 */
export const appUptime = new Gauge({
  name: "app_uptime_seconds",
  help: "Application uptime in seconds",
  registers: [metricsRegistry],
});

/**
 * Application info gauge (for labels)
 */
export const appInfo = new Gauge({
  name: "app_info",
  help: "Application information",
  labelNames: ["version", "node_env"] as const,
  registers: [metricsRegistry],
});

// Set app info on startup
appInfo.set(
  { version: "1.0.0", node_env: process.env.NODE_ENV || "development" },
  1
);

// Update uptime periodically
setInterval(() => {
  appUptime.set(process.uptime());
}, 5000);


logger.info("Metrics registry initialized");
