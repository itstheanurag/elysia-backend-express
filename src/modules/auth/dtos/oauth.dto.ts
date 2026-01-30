import { t } from "elysia";
import { OAUTH_PROVIDERS } from "../models";

// OAuth provider parameter schema
export const providerParams = t.Object({
  provider: t.Union([
    t.Literal("google"),
    t.Literal("github"),
    t.Literal("facebook"),
    t.Literal("apple"),
  ]),
});

// OAuth callback query parameters
export const callbackQuery = t.Object({
  code: t.String(),
  state: t.Optional(t.String()),
  error: t.Optional(t.String()),
});

// OAuth login request
export const loginQuery = t.Object({
  redirect_uri: t.Optional(t.String()),
});

// OAuth login response
export const oauthLoginResponse = t.Object({
  authUrl: t.String(),
});

// OAuth callback response
export const callbackResponse = t.Object({
  success: t.Boolean(),
  data: t.Optional(
    t.Object({
      user: t.Object({
        id: t.Number(),
        email: t.String(),
        name: t.String(),
        provider: t.String(),
      }),
      token: t.String(),
      isNew: t.Boolean(),
    }),
  ),
  message: t.Optional(t.String()),
  errors: t.Optional(t.Array(t.String())),
});

// Linked providers list response
export const linkedProvidersResponse = t.Object({
  success: t.Boolean(),
  data: t.Array(
    t.Object({
      provider: t.String(),
      linkedAt: t.String(),
    }),
  ),
});

// Link provider request
export const linkProviderQuery = t.Object({
  redirect_uri: t.Optional(t.String()),
});

// Link provider response
export const linkProviderResponse = t.Object({
  success: t.Boolean(),
  message: t.String(),
  data: t.Optional(
    t.Object({
      provider: t.String(),
    }),
  ),
});

// Unlink provider response
export const unlinkProviderResponse = t.Object({
  success: t.Boolean(),
  message: t.String(),
});

// OAuth error response
export const errorResponse = t.Object({
  success: t.Boolean(),
  message: t.String(),
  errors: t.Optional(t.Array(t.String())),
});



