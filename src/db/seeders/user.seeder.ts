/**
 * User Seeder
 * Seeds initial user data for development/testing
 */

import { createLogger } from "@core/logger";
import { db } from "@db/index";
import { users } from "@modules/user/models";
import { eq } from "drizzle-orm";
import type { SeederContext } from "./index";

const logger = createLogger("seeder:users");

/**
 * Seed users table with initial data
 */
export async function seedUsers(context: SeederContext): Promise<void> {
  logger.info({ environment: context.environment }, "Seeding users");

  // Only seed test users in development/test environments
  if (context.environment === "production") {
    logger.info("Skipping user seeding in production");
    return;
  }

  if (!db) {
    logger.warn("Database not available, skipping user seeding");
    return;
  }

  const testUsers = [
    {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash: await Bun.password.hash("admin123", {
        algorithm: "argon2id",
        memoryCost: 65536,
        timeCost: 3,
      }),
      emailVerified: true,
    },
    {
      email: "user@example.com",
      name: "Test User",
      passwordHash: await Bun.password.hash("user123", {
        algorithm: "argon2id",
        memoryCost: 65536,
        timeCost: 3,
      }),
      emailVerified: true,
    },
  ];

  for (const userData of testUsers) {
    // Check if user already exists
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existing) {
      logger.debug({ email: userData.email }, "User already exists, skipping");
      continue;
    }

    await db.insert(users).values(userData);
    logger.info({ email: userData.email }, "Created test user");
  }

  logger.info("User seeding completed");
}
