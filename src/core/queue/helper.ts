import {
  httpRequestsTotal,
  httpRequestDuration,
  queueJobsTotal,
  queueJobDuration,
  queueJobsWaiting,
  queueJobsActive,
  queueJobsFailed,
  queueJobsDelayed,
  metricsRegistry,
} from "./metrics";

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number
): void {
  // Normalize path to reduce cardinality (replace IDs with :id)
  const normalizedPath = normalizePath(path);

  httpRequestsTotal.inc({
    method,
    path: normalizedPath,
    status: String(status),
  });
  httpRequestDuration.observe(
    { method, path: normalizedPath, status: String(status) },
    durationMs / 1000
  );
}

/**
 * Record queue job metrics
 */
export function recordQueueJob(
  queue: string,
  status: "completed" | "failed",
  durationMs?: number
): void {
  queueJobsTotal.inc({ queue, status });

  if (durationMs !== undefined) {
    queueJobDuration.observe({ queue }, durationMs / 1000);
  }
}

/**
 * Update queue gauge metrics
 */
export function updateQueueGauges(
  queue: string,
  counts: {
    waiting?: number;
    active?: number;
    failed?: number;
    delayed?: number;
  }
): void {
  if (counts.waiting !== undefined) {
    queueJobsWaiting.set({ queue }, counts.waiting);
  }
  if (counts.active !== undefined) {
    queueJobsActive.set({ queue }, counts.active);
  }
  if (counts.failed !== undefined) {
    queueJobsFailed.set({ queue }, counts.failed);
  }
  if (counts.delayed !== undefined) {
    queueJobsDelayed.set({ queue }, counts.delayed);
  }
}

/**
 * Get all metrics as Prometheus text format
 */
export async function getMetrics(): Promise<string> {
  return metricsRegistry.metrics();
}

/**
 * Get content type for metrics response
 */
export function getMetricsContentType(): string {
  return metricsRegistry.contentType;
}

/**
 * Normalize path to reduce metric cardinality
 * Replaces UUIDs and numeric IDs with placeholders
 */
function normalizePath(path: string): string {
  return (
    path
      // Remove query string
      .split("?")[0]
      // Replace UUIDs
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ":id"
      )
      // Replace numeric IDs
      .replace(/\/\d+/g, "/:id")
      // Normalize trailing slashes
      .replace(/\/+$/, "") || "/"
  );
}
