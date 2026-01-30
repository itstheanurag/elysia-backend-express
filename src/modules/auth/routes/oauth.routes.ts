/**
 * OAuth Routes
 * HTTP routes for OAuth authentication
 */

import { Elysia } from "elysia";
import { OAuthService } from "../services";
import {
  providerParams,
  loginQuery,
  oauthLoginResponse,
  callbackQuery,
  callbackResponse,
  linkedProvidersResponse,
  unlinkProviderResponse,
} from "../dtos";
import { authGuard } from "../middleware";

export const oauthRoutes = new Elysia({
  prefix: "/oauth",
  name: "routes-oauth",
  detail: {
    tags: ["OAuth"],
  },
})
  // Get OAuth login URL
  .get(
    "/:provider/login",
    async ({ params, query }) => {
      const { provider } = params;
      const { redirect_uri } = query;

      const authUrl = OAuthService.getAuthUrl(provider, redirect_uri);

      return { authUrl };
    },
    {
      params: providerParams,
      query: loginQuery,
      response: oauthLoginResponse,
      detail: {
        summary: "Redirect to OAuth provider login",
        description: "Get authentication URL for OAuth provider",
      },
    },
  )

  // Handle OAuth callback
  .get(
    "/:provider/callback",
    async ({ params, query }) => {
      const { provider } = params;
      const { code, error } = query;

      if (error) {
        return {
          success: false,
          message: `OAuth failed: ${error}`,
        };
      }

      if (!code) {
        return {
          success: false,
          message: "Missing authorization code",
        };
      }

      try {
        const result = await OAuthService.handleCallback(provider, code);

        return {
          success: true,
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          message:
            error instanceof Error ? error.message : "OAuth callback failed",
        };
      }
    },
    {
      params: providerParams,
      query: callbackQuery,
      response: callbackResponse,
      detail: {
        summary: "OAuth callback handler",
        description: "Handle OAuth provider callback",
      },
    },
  )

  // Get linked OAuth providers for authenticated user
  .get(
    "/linked-providers",
    async ({ auth }: any) => {
      const providers = await OAuthService.getLinkedProviders(auth.userId);

      return {
        success: true,
        data: providers.map((p: any) => ({
          ...p,
          linkedAt: p.linkedAt.toISOString(),
        })),
      };
    },
    {
      middleware: [authGuard],
      response: linkedProvidersResponse,
      detail: {
        summary: "Get linked OAuth providers",
        description:
          "Get all linked OAuth providers for the authenticated user",
      },
    },
  )

  // Unlink OAuth provider from authenticated user
  .delete(
    "/:provider/unlink",
    async ({ params, auth }: any) => {
      const { provider } = params;

      const success = await OAuthService.unlinkProvider(auth.userId, provider);

      if (!success) {
        return {
          success: false,
          message: `Provider ${provider} not linked`,
        };
      }

      return {
        success: true,
        message: `Provider ${provider} unlinked successfully`,
      };
    },
    {
      params: providerParams,
      middleware: [authGuard],
      response: unlinkProviderResponse,
      detail: {
        summary: "Unlink OAuth provider",
        description: "Unlink OAuth provider from user account",
      },
    },
  );
