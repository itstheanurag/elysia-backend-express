/**
 * Auth Middleware
 * Protects routes that require authentication
 */

import { Elysia } from "elysia";
import { verifyJWT } from "./jwt";
import { UnauthorizedException } from "@core/exceptions";

/**
 * Auth guard plugin - adds user context to protected routes
 *
 * @example
 * ```ts
 * app
 *   .use(authGuard)
 *   .get("/profile", ({ user }) => {
 *     return { userId: user.id };
 *   });
 * ```
 */
export const authGuard = new Elysia({ name: "auth-guard" }).derive(
  async ({ headers }) => {
    const authorization = headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException("Missing authorization header");
    }

    // Support both "Bearer <token>" and raw token
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : authorization;

    const payload = await verifyJWT(token);

    if (!payload) {
      throw new UnauthorizedException("Invalid or expired token");
    }

    return {
      user: {
        id: payload.userId,
        email: payload.email,
      },
    };
  }
);

/**
 * Optional auth - adds user if token present, null otherwise
 */
export const optionalAuth = new Elysia({ name: "optional-auth" }).derive(
  async ({ headers }) => {
    const authorization = headers.authorization;

    if (!authorization) {
      return { user: null as null };
    }

    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : authorization;

    const payload = await verifyJWT(token);

    if (!payload) {
      return { user: null as null };
    }

    return {
      user: {
        id: payload.userId,
        email: payload.email,
      },
    };
  }
);

// Type for use in route handlers
export type AuthUser = {
  id: number;
  email: string;
};
