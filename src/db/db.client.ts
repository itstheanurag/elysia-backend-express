/**
 * Database Client
 * PostgreSQL connection using Drizzle ORM with health monitoring
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { logger } from "@core/logger";
import * as schema from "./schema/schema";

export interface DatabaseHealthStatus {
  connected: boolean;
  latencyMs: number;
  error?: string;
}

export interface PoolStats {
  size: number;
  idle: number;
  pending: number;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.warn("DATABASE_URL not set - database features will not be available");
}

// Create postgres connection pool with sensible defaults
const client = connectionString
  ? postgres(connectionString, {
      max: 20,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    })
  : null;

// Create Drizzle ORM instance
export const db = client ? drizzle(client, { schema }) : null;

/**
 * Check database connectivity
 * Performs a simple query to validate the connection
 */
export async function checkHealth(): Promise<DatabaseHealthStatus> {
  if (!client) {
    return {
      connected: false,
      latencyMs: 0,
      error: "Database not configured",
    };
  }

  const start = performance.now();

  try {
    await client`SELECT 1 as health_check`;
    return {
      connected: true,
      latencyMs: Math.round(performance.now() - start),
    };
  } catch (error) {
    return {
      connected: false,
      latencyMs: Math.round(performance.now() - start),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get connection pool statistics
 */
export function getPoolStats(): PoolStats | null {
  if (!client) {
    return null;
  }

  return {
    size: client.options.max ?? 20,
    idle: client.options.idle_timeout ?? 20,
    pending: 0,
  };
}

/**
 * Gracefully close all database connections
 */
export async function disconnect(): Promise<void> {
  if (client) {
    logger.info("Closing database connections...");
    await client.end();
    logger.info("Database connections closed");
  }
}

// Log connection status on startup
if (client) {
  checkHealth().then((status) => {
    if (status.connected) {
      logger.info(
        { latencyMs: status.latencyMs },
        "Database connected successfully"
      );
    } else {
      logger.error({ error: status.error }, "Database connection failed");
    }
  });
}
