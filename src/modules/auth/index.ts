/**
 * Auth Module
 * HTTP routes for authentication with rate limiting
 */

import { Elysia } from "elysia";
import { authRoutes } from "./routes";
import { oauthRoutes } from "./routes";

export const authModule = new Elysia({
  name: "module-auth",
  prefix: "/auth",
  detail: {
    tags: ["Authentication"],
  },
})
  .use(authRoutes)
  .use(oauthRoutes);

// Export middleware for use in other modules
export { authGuard, optionalAuth } from "./middleware";
export { signJWT, verifyJWT, type JWTPayload } from "./jwt";
export { AuthService, OAuthService } from "./services";
export {
  OAuthProviderRepository,
  PasswordResetTokenRepository,
} from "./repositories";
