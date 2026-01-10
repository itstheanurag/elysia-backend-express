/**
 * Auth Module
 * HTTP routes for authentication with rate limiting
 */

import { Elysia } from "elysia";
import {
  signupBody,
  signupResponse,
  loginBody,
  loginResponse,
  forgotPasswordBody,
  forgotPasswordResponse,
  resetPasswordBody,
  resetPasswordResponse,
} from "./dtos";
import { AuthService } from "./service";
import { BadRequestException, UnauthorizedException } from "@core/exceptions";
import { rateLimit } from "@plugins/rate-limit.plugin";

// Strict rate limit for auth endpoints: 5 requests per minute
const authRateLimit = rateLimit({ windowMs: 60 * 1000, max: 5 });

export const authModule = new Elysia({
  name: "module-auth",
  prefix: "/auth",
  detail: {
    tags: ["Authentication"],
  },
})
  /**
   * Register a new user
   */
  .post(
    "/signup",
    async ({ body }) => {
      const result = await AuthService.signup(body);

      if ("error" in result) {
        if (result.error === "EMAIL_EXISTS") {
          throw new BadRequestException("Email already registered");
        }
        throw new BadRequestException("Registration failed");
      }

      return {
        success: true as const,
        message: "Account created successfully",
        data: result.user,
      };
    },
    {
      body: signupBody,
      response: signupResponse,
      detail: {
        summary: "Sign up",
        description: "Create a new user account",
      },
    }
  )

  /**
   * Authenticate user (rate limited)
   */
  .use(authRateLimit)
  .post(
    "/login",
    async ({ body }) => {
      const result = await AuthService.login(body);

      if ("error" in result) {
        throw new UnauthorizedException("Invalid email or password");
      }

      return {
        success: true as const,
        data: {
          token: result.token,
          user: result.user,
        },
      };
    },
    {
      body: loginBody,
      response: loginResponse,
      detail: {
        summary: "Login",
        description:
          "Authenticate and receive access token (rate limited: 5/min)",
      },
    }
  )

  /**
   * Request password reset (rate limited)
   */
  .post(
    "/forgot-password",
    async ({ body }) => {
      await AuthService.forgotPassword(body);

      return {
        success: true as const,
        message:
          "If an account exists with this email, you will receive a password reset link",
      };
    },
    {
      body: forgotPasswordBody,
      response: forgotPasswordResponse,
      detail: {
        summary: "Forgot password",
        description: "Request a password reset token (rate limited: 5/min)",
      },
    }
  )

  /**
   * Reset password with token
   */
  .post(
    "/reset-password",
    async ({ body }) => {
      const result = await AuthService.resetPassword(body);

      if ("error" in result) {
        throw new BadRequestException("Invalid or expired reset token");
      }

      return {
        success: true as const,
        message: "Password reset successfully",
      };
    },
    {
      body: resetPasswordBody,
      response: resetPasswordResponse,
      detail: {
        summary: "Reset password",
        description: "Reset password using the reset token",
      },
    }
  );

// Export middleware for use in other modules
export { authGuard, optionalAuth } from "./middleware";
export { signJWT, verifyJWT, type JWTPayload } from "./jwt";
