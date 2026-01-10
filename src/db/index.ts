/**
 * Database Exports
 */

export { db, checkHealth, getPoolStats, disconnect } from "./db.client";
export type { DatabaseHealthStatus, PoolStats } from "./db.client";

// Class-based repository (alternative)
export { BaseRepository } from "./base.repository";

// Schema exports
export * from "./schema/schema";
