/**
 * OAuth Provider Repository
 * Database operations for OAuth provider accounts
 */

import { eq, and } from "drizzle-orm";
import { BaseRepository } from "@db/index";
import { oauthProviders, type OAuthProvider } from "../models";
import type { Transaction } from "@db/base.repository";

class OAuthProviderRepositoryClass extends BaseRepository<
  typeof oauthProviders
> {
  constructor() {
    super(oauthProviders, oauthProviders.id);
  }

  /**
   * Find OAuth provider by provider type and provider ID
   */
  async findByProvider(
    provider: string,
    providerId: string,
    tx?: Transaction,
  ): Promise<OAuthProvider | null> {
    return await this.findOneBy(
      and(
        eq(oauthProviders.provider, provider),
        eq(oauthProviders.providerId, providerId),
      )!,
      tx,
    );
  }

  /**
   * Find all OAuth providers for a user
   */
  async findByUserId(
    userId: number,
    tx?: Transaction,
  ): Promise<OAuthProvider[]> {
    return await this.findBy(eq(oauthProviders.userId, userId), tx);
  }

  /**
   * Create a new OAuth provider account
   */
  async create(
    data: {
      userId: number;
      provider: string;
      providerId: string;
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: Date;
    },
    tx?: Transaction,
  ): Promise<OAuthProvider> {
    return await this.create(
      {
        userId: data.userId,
        provider: data.provider,
        providerId: data.providerId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      },
      tx,
    );
  }

  /**
   * Update OAuth provider tokens
   */
  async updateTokens(
    id: number,
    data: {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: Date;
    },
    tx?: Transaction,
  ): Promise<OAuthProvider | null> {
    return await this.update(
      id,
      {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
      },
      tx,
    );
  }

  /**
   * Delete OAuth provider account by provider and user ID
   */
  async deleteByProvider(
    userId: number,
    provider: string,
    tx?: Transaction,
  ): Promise<boolean> {
    const result = await this.deleteBy(
      and(
        eq(oauthProviders.userId, userId),
        eq(oauthProviders.provider, provider),
      )!,
      tx,
    );
    return result > 0;
  }

  /**
   * Check if user has a specific OAuth provider linked
   */
  async hasProvider(
    userId: number,
    provider: string,
    tx?: Transaction,
  ): Promise<boolean> {
    const result = await this.findOneBy(
      and(
        eq(oauthProviders.userId, userId),
        eq(oauthProviders.provider, provider),
      )!,
      tx,
    );
    return result !== null;
  }
}

// Export singleton instance
export const OAuthProviderRepository = new OAuthProviderRepositoryClass();
