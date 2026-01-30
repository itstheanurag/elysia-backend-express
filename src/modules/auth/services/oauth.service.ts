/**
 * OAuth Service
 * Business logic for OAuth 2.0 authentication with social providers
 */

import { createLogger, logEvent } from "@core/logger";
import { signJWT } from "../jwt";
import { OAuthProviderRepository } from "../repositories";
import { UserRepository } from "@modules/user/repositories";
import { OAUTH_PROVIDERS, type OAuthProvider } from "../models";
import { env } from "@config/env";
import { db } from "@db/index";
import { randomUUID } from "crypto";
import { OAuthResult, OAuthUserInfo } from "../oauth.type";

const logger = createLogger("oauth-service");

// Provider configurations
const oauthConfigs: Record<
  string,
  {
    authUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    scopes: string;
    clientId: string | undefined;
    clientSecret: string | undefined;
  }
> = {
  [OAUTH_PROVIDERS.GOOGLE]: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scopes: env.OAUTH_SCOPE,
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
  },
  [OAUTH_PROVIDERS.GITHUB]: {
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    scopes: "read:user user:email",
    clientId: env.GITHUB_CLIENT_ID,
    clientSecret: env.GITHUB_CLIENT_SECRET,
  },
  [OAUTH_PROVIDERS.APPLE]: {
    authUrl: "https://appleid.apple.com/auth/authorize",
    tokenUrl: "https://appleid.apple.com/auth/token",
    userInfoUrl: "https://appleid.apple.com/auth/user-info",
    scopes: "name email",
    clientId: env.APPLE_CLIENT_ID,
    clientSecret: undefined, // Apple uses private key instead
  },
};

export abstract class OAuthService {
  /**
   * Generate OAuth authorization URL for a provider
   */
  static getAuthUrl(provider: string, redirectUri?: string): string {
    const config = oauthConfigs[provider.toLowerCase()];
    if (!config || !config.clientId) {
      throw new Error(`OAuth provider "${provider}" is not configured`);
    }

    const state = randomUUID();
    const redirect = redirectUri || env.OAUTH_REDIRECT_URL;

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirect,
      response_type: "code",
      scope: config.scopes,
      state,
      access_type: "offline",
      prompt: "consent",
    });

    // Provider-specific parameters
    if (provider === OAUTH_PROVIDERS.GOOGLE) {
      params.append("hd", "*"); // Allow any hosted domain
    }

    logger.debug({ provider, state }, "Generated OAuth authorization URL");

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(
    provider: string,
    code: string,
    redirectUri?: string,
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
  }> {
    const config = oauthConfigs[provider.toLowerCase()];
    if (!config) {
      throw new Error(`OAuth provider "${provider}" is not supported`);
    }

    const redirect = redirectUri || env.OAUTH_REDIRECT_URL;

    const params: Record<string, string> = {
      client_id: config.clientId || "",
      code,
      redirect_uri: redirect,
      grant_type: "authorization_code",
    };

    // Add client secret for providers that require it
    if (config.clientSecret) {
      params.client_secret = config.clientSecret;
    }

    // Apple uses private key JWT for authentication
    if (
      provider === OAUTH_PROVIDERS.APPLE &&
      env.APPLE_CLIENT_ID &&
      env.APPLE_TEAM_ID &&
      env.APPLE_PRIVATE_KEY
    ) {
      // Apple requires JWT-based client secret
      params.client_secret = await this.generateAppleClientSecret();
    }

    const response = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(params),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(
        { provider, error },
        "Failed to exchange OAuth code for tokens",
      );
      throw new Error("Failed to exchange authorization code");
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Get user info from OAuth provider
   */
  static async getUserInfo(
    provider: string,
    accessToken: string,
  ): Promise<OAuthUserInfo> {
    const config = oauthConfigs[provider.toLowerCase()];
    if (!config) {
      throw new Error(`OAuth provider "${provider}" is not supported`);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    };

    // GitHub requires user agent
    if (provider === OAUTH_PROVIDERS.GITHUB) {
      headers["User-Agent"] = "Elysia-Backend";
    }

    const response = await fetch(config.userInfoUrl, { headers });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ provider, error }, "Failed to get OAuth user info");
      throw new Error("Failed to get user information");
    }

    const data = await response.json();

    // Provider-specific user info mapping
    switch (provider) {
      case OAUTH_PROVIDERS.GOOGLE:
        return {
          provider,
          providerId: data.id,
          email: data.email,
          name: data.name,
          avatarUrl: data.picture,
          accessToken,
        };
      case OAUTH_PROVIDERS.GITHUB:
        return {
          provider,
          providerId: String(data.id),
          email: data.email,
          name: data.name || data.login,
          avatarUrl: data.avatar_url,
          accessToken,
        };
      case OAUTH_PROVIDERS.APPLE:
        return {
          provider,
          providerId: data.sub,
          email: data.email,
          name: data.name?.firstName
            ? `${data.name.firstName} ${data.name.lastName || ""}`
            : undefined,
          accessToken,
        };
      default:
        throw new Error(`OAuth provider "${provider}" is not supported`);
    }
  }

  /**
   * Handle OAuth callback - main entry point for OAuth flow
   */
  static async handleCallback(
    provider: string,
    code: string,
    redirectUri?: string,
  ): Promise<OAuthResult> {
    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(
      provider,
      code,
      redirectUri,
    );

    // Get user info from provider
    const userInfo = await this.getUserInfo(provider, tokens.accessToken);

    // Calculate expiry
    const expiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : undefined;

    // Check if user already exists via OAuth provider
    const existingProvider = await OAuthProviderRepository.findByProvider(
      provider,
      userInfo.providerId,
    );

    if (existingProvider) {
      // Update tokens for existing provider
      await OAuthProviderRepository.updateTokens(existingProvider.id, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
      });

      // Get the user
      const user = await UserRepository.findById(existingProvider.userId);
      if (!user) {
        throw new Error("User not found for existing OAuth provider");
      }

      // Generate JWT
      const token = await signJWT({ userId: user.id, email: user.email });

      logEvent("oauth.login", { userId: user.id, provider });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name || "",
          provider,
        },
        token,
        isNew: false,
      };
    }

    // Check if user exists by email (allow linking)
    if (userInfo.email) {
      const existingUser = await UserRepository.findByEmail(userInfo.email);
      if (existingUser) {
        // Link existing user to OAuth provider
        await OAuthProviderRepository.create({
          userId: existingUser.id,
          provider,
          providerId: userInfo.providerId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt,
        });

        // Update user avatar if available
        if (userInfo.avatarUrl) {
          await UserRepository.update(existingUser.id, {
            avatarUrl: userInfo.avatarUrl,
            emailVerified: true,
            updatedAt: new Date(),
          });
        }

        // Generate JWT
        const token = await signJWT({
          userId: existingUser.id,
          email: existingUser.email,
        });

        logEvent("oauth.link", { userId: existingUser.id, provider });

        return {
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name || userInfo.name || "",
            provider,
          },
          token,
          isNew: false,
        };
      }
    }

    // Create new user
    const newUser = await (db as any).transaction(async (tx: any) => {
      const user = await UserRepository.createWithPassword(
        {
          email: userInfo.email || `${userInfo.providerId}@${provider}.oauth`,
          passwordHash: "", // OAuth users don't have password
          name: userInfo.name,
        },
        tx,
      );

      await OAuthProviderRepository.create(
        {
          userId: user.id,
          provider,
          providerId: userInfo.providerId,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt,
        },
        tx,
      );

      // Update user with avatar if available
      if (userInfo.avatarUrl) {
        await UserRepository.update(
          user.id,
          { avatarUrl: userInfo.avatarUrl, emailVerified: true },
          tx,
        );
      }

      return user;
    });

    // Generate JWT
    const token = await signJWT({ userId: newUser.id, email: newUser.email });

    logEvent("oauth.signup", { userId: newUser.id, provider });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name || userInfo.name || "",
        provider,
      },
      token,
      isNew: true,
    };
  }

  /**
   * Link OAuth provider to existing user account
   */
  static async linkProvider(
    userId: number,
    provider: string,
    code: string,
    redirectUri?: string,
  ): Promise<OAuthProvider> {
    // Check if provider is already linked
    const hasProvider = await OAuthProviderRepository.hasProvider(
      userId,
      provider,
    );
    if (hasProvider) {
      throw new Error(`Account is already linked with ${provider}`);
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(
      provider,
      code,
      redirectUri,
    );

    // Get user info from provider
    const userInfo = await this.getUserInfo(provider, tokens.accessToken);

    // Check if provider account is already linked to another user
    const existingProvider = await OAuthProviderRepository.findByProvider(
      provider,
      userInfo.providerId,
    );
    if (existingProvider) {
      throw new Error(
        `This ${provider} account is already linked to another user`,
      );
    }

    // Calculate expiry
    const expiresAt = tokens.expiresIn
      ? new Date(Date.now() + tokens.expiresIn * 1000)
      : undefined;

    // Create OAuth provider link
    const oauthProvider = await OAuthProviderRepository.create({
      userId,
      provider,
      providerId: userInfo.providerId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
    });

    // Update user avatar if available
    if (userInfo.avatarUrl) {
      await UserRepository.update(userId, { avatarUrl: userInfo.avatarUrl });
    }

    logEvent("oauth.link", { userId, provider });

    return oauthProvider;
  }

  /**
   * Unlink OAuth provider from user account
   */
  static async unlinkProvider(
    userId: number,
    provider: string,
  ): Promise<boolean> {
    const result = await OAuthProviderRepository.deleteByProvider(
      userId,
      provider,
    );

    if (result) {
      logEvent("oauth.unlink", { userId, provider });
    }

    return result;
  }

  /**
   * Get linked OAuth providers for a user
   */
  static async getLinkedProviders(
    userId: number,
  ): Promise<Array<{ provider: string; linkedAt: Date }>> {
    const providers = await OAuthProviderRepository.findByUserId(userId);

    return providers.map((p) => ({
      provider: p.provider,
      linkedAt: p.createdAt,
    }));
  }

  /**
   * Generate Apple client secret (JWT)
   */
  private static async generateAppleClientSecret(): Promise<string> {
    // Apple requires JWT-based client authentication
    // This is a simplified implementation - in production, use a proper JWT library
    const header = {
      alg: "ES256",
      kid: env.APPLE_TEAM_ID!,
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: env.APPLE_TEAM_ID,
      aud: "https://appleid.apple.com",
      sub: env.APPLE_CLIENT_ID,
      iat: now,
      exp: now + 3600,
    };

    // In a real implementation, you would sign this with the private key
    // For now, return a placeholder - this needs proper JWT signing
    return Buffer.from(JSON.stringify({ ...header, ...payload })).toString(
      "base64url",
    );
  }
}
