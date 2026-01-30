/**
 * Password Reset Token Repository
 * Database operations for password reset tokens
 */

import { eq } from "drizzle-orm";
import { BaseRepository } from "@db/index";
import { passwordResetTokens, type PasswordResetToken } from "../models";

class PasswordResetTokenRepositoryClass extends BaseRepository<
  typeof passwordResetTokens
> {
  constructor() {
    super(passwordResetTokens, passwordResetTokens.id);
  }

  /**
   * Create a password reset token for a user
   */
  async createForUser(userId: number): Promise<PasswordResetToken> {
    const expiresAt = new Date(Date.now() + 3600000 * 24); // 24 hours
    return this.create({
      userId,
      expiresAt,
    });
  }

  /**
   * Find a valid password reset token
   */
  async findValidToken(token: string): Promise<PasswordResetToken | null> {
    // This is a placeholder - in real implementation, you would find by token
    // and check expiry
    const [record] = await this.getDb()
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.id, 1)); // Temporary placeholder

    if (record && record.expiresAt > new Date() && !record.usedAt) {
      return record;
    }

    return null;
  }

  /**
   * Mark a password reset token as used
   */
  async markAsUsed(id: number): Promise<void> {
    await this.update(id, {
      usedAt: new Date(),
    });
  }
}

// Export singleton instance
export const PasswordResetTokenRepository =
  new PasswordResetTokenRepositoryClass();
