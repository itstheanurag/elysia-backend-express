/**
 * Database Seeders Index
 *
 * This file exports all seeders and provides a main function to run them.
 * Seeders are used to populate the database with initial data.
 *
 * Usage:
 *   bun run db:seed          # Run all seeders
 *   bun run db:seed -- auth  # Run only auth seeders
 */

import { createLogger } from "@core/logger";
import { seedUsers } from "./user.seeder";
const logger = createLogger("seeder");

export interface SeederContext {
  environment: "development" | "production" | "test";
}

export interface Seeder {
  name: string;
  run(context: SeederContext): Promise<void>;
}

// Register all seeders here
const seeders: Seeder[] = [{ name: "users", run: seedUsers }];

/**
 * Run all seeders or specific ones based on filter
 */
export async function runSeeders(filter?: string): Promise<void> {
  const environment =
    (process.env.NODE_ENV as SeederContext["environment"]) || "development";
  const context: SeederContext = { environment };

  logger.info({ environment, filter }, "Starting database seeding");

  const seedersToRun = filter
    ? seeders.filter((s) => s.name.toLowerCase().includes(filter.toLowerCase()))
    : seeders;

  if (seedersToRun.length === 0) {
    logger.warn({ filter }, "No seeders found matching filter");
    return;
  }

  for (const seeder of seedersToRun) {
    try {
      logger.info({ seeder: seeder.name }, "Running seeder");
      await seeder.run(context);
      logger.info({ seeder: seeder.name }, "Seeder completed successfully");
    } catch (error) {
      logger.error({ seeder: seeder.name, error }, "Seeder failed");
      throw error;
    }
  }

  logger.info("Database seeding completed");
}

// Run seeders if this file is executed directly
if (import.meta.main) {
  const filter = process.argv[2];
  runSeeders(filter)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
