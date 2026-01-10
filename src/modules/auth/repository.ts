/**
 * Password Reset Token Repository
 */

import { eq, and, gt, isNull } from "drizzle-orm";
import { BaseRepository } from "@db/index";
import { passwordResetTokens } from "./models";

class PasswordResetTokenRepositoryClass extends BaseRepository<
  typeof passwordResetTokens
> {
  constructor() {
    super(passwordResetTokens, passwordResetTokens.id);
  }

  /**
   * Find valid token (not expired and not used)
   */
  async findValidToken(token: string) {
    const condition = and(
      eq(passwordResetTokens.token, token),
      gt(passwordResetTokens.expiresAt, new Date()),
      isNull(passwordResetTokens.usedAt)
    );

    if (!condition) return null;

    return this.findOneBy(condition);
  }

  /**
   * Mark token as used
   */
  async markAsUsed(id: number) {
    return this.update(id, { usedAt: new Date() });
  }

  /**
   * Create reset token for user
   */
  async createForUser(userId: number, expiresInMs: number = 60 * 60 * 1000) {
    const expiresAt = new Date(Date.now() + expiresInMs);
    return this.create({ userId, expiresAt });
  }
}

export const PasswordResetTokenRepository =
  new PasswordResetTokenRepositoryClass();
