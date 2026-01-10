/**
 * Password Reset Token Model (Database Schema)
 * Drizzle table definition for password reset tokens
 */

import { pgTable, serial, uuid, timestamp } from "drizzle-orm/pg-core";
import { users } from "@modules/user/models";

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  token: uuid("token").defaultRandom().notNull().unique(),
  userId: serial("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
