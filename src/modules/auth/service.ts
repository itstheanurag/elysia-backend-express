/**
 * Auth Service
 * Business logic for authentication using repositories
 */

import { createLogger, logEvent } from "@core/logger";
import { signJWT } from "./jwt";
import { PasswordResetTokenRepository } from "./repository";
import { UserRepository } from "@modules/user/repository";
import type {
  SignupBody,
  LoginBody,
  ForgotPasswordBody,
  ResetPasswordBody,
} from "./dtos";

const logger = createLogger("auth-service");

export abstract class AuthService {
  /**
   * Register a new user
   */
  static async signup(data: SignupBody) {
    // Check if email already exists
    const exists = await UserRepository.emailExists(data.email);

    if (exists) {
      return { error: "EMAIL_EXISTS" as const };
    }

    // Hash password using Bun's native Argon2
    const passwordHash = await Bun.password.hash(data.password, {
      algorithm: "argon2id",
      memoryCost: 65536,
      timeCost: 3,
    });

    // Create user using repository
    const user = await UserRepository.createWithPassword({
      email: data.email,
      passwordHash,
      name: data.name,
    });

    logEvent("auth.signup", { userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Authenticate user and return JWT
   */
  static async login(data: LoginBody) {
    // Find user by email using repository
    const user = await UserRepository.findByEmail(data.email);

    if (!user || !user.passwordHash) {
      return { error: "INVALID_CREDENTIALS" as const };
    }

    // Verify password
    const valid = await Bun.password.verify(data.password, user.passwordHash);
    if (!valid) {
      return { error: "INVALID_CREDENTIALS" as const };
    }

    // Update last login using repository
    await UserRepository.updateLastLogin(user.id);

    // Generate JWT
    const token = await signJWT({ userId: user.id, email: user.email });

    logEvent("auth.login", { userId: user.id });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }

  /**
   * Generate password reset token
   */
  static async forgotPassword(data: ForgotPasswordBody) {
    // Find user by email using repository
    const user = await UserRepository.findByEmail(data.email);

    // Always return success to prevent email enumeration
    if (!user) {
      logger.debug(
        { email: data.email },
        "Password reset for non-existent email"
      );
      return { success: true };
    }

    // Create reset token using repository
    const resetToken = await PasswordResetTokenRepository.createForUser(
      user.id
    );

    // In production, send email with reset link
    logger.info(
      { userId: user.id, token: resetToken.token },
      "Password reset token generated"
    );

    logEvent("auth.forgot_password", { userId: user.id });

    return { success: true, token: resetToken.token };
  }

  /**
   * Reset password using token
   */
  static async resetPassword(data: ResetPasswordBody) {
    // Find valid token using repository
    const tokenRecord = await PasswordResetTokenRepository.findValidToken(
      data.token
    );

    if (!tokenRecord) {
      return { error: "INVALID_TOKEN" as const };
    }

    // Hash new password
    const passwordHash = await Bun.password.hash(data.password, {
      algorithm: "argon2id",
      memoryCost: 65536,
      timeCost: 3,
    });

    // Update password using repository
    await UserRepository.updatePassword(tokenRecord.userId, passwordHash);

    // Mark token as used
    await PasswordResetTokenRepository.markAsUsed(tokenRecord.id);

    logEvent("auth.reset_password", { userId: tokenRecord.userId });

    return { success: true };
  }
}
