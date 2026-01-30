/**
 * OAuth Provider Model (Database Schema)
 * Drizzle table definition for OAuth provider accounts
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "@modules/user/models";

export const oauthProviders = pgTable(
  "oauth_providers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    provider: varchar("provider", { length: 50 }).notNull(), // 'google', 'github', 'facebook', 'apple'
    providerId: varchar("provider_id", { length: 255 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Unique constraint for provider + providerId to prevent duplicate accounts
    primaryKey({
      name: "oauth_providers_provider_providerId_pk",
      columns: [table.provider, table.providerId],
    }),
  ],
);

export type OAuthProvider = typeof oauthProviders.$inferSelect;
export type NewOAuthProvider = typeof oauthProviders.$inferInsert;

// Supported OAuth providers
export const OAUTH_PROVIDERS = {
  GOOGLE: "google",
  GITHUB: "github",
  FACEBOOK: "facebook",
  APPLE: "apple",
} as const;

export type OAuthProviderType =
  (typeof OAUTH_PROVIDERS)[keyof typeof OAUTH_PROVIDERS];
