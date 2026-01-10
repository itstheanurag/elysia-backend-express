/**
 * User Repository
 * Extends BaseRepository with user-specific operations
 */

import { eq, like, or } from "drizzle-orm";
import { BaseRepository } from "@db/index";
import { users } from "./models";
import { NotFoundException } from "@core/exceptions";
import type { Transaction } from "@db/base.repository";

class UserRepositoryClass extends BaseRepository<typeof users> {
  constructor() {
    super(users, users.id);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string, tx?: Transaction) {
    return await this.findOneBy(eq(users.email, email.toLowerCase()), tx);
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string, tx?: Transaction): Promise<boolean> {
    return await this.existsBy(eq(users.email, email.toLowerCase()), tx);
  }

  /**
   * Search users by email or name
   */
  async search(query: string, options: { page?: number; limit?: number } = {}) {
    const whereClause = or(
      like(users.email, `%${query}%`),
      like(users.name, `%${query}%`)
    );

    return await this.findAll(options, whereClause);
  }

  /**
   * Create user with password hash
   */
  async createWithPassword(
    data: { email: string; passwordHash: string; name?: string },
    tx?: Transaction
  ) {
    return await this.create(
      {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        name: data.name,
      },
      tx
    );
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: number, tx?: Transaction) {
    return await this.update(id, { lastLoginAt: new Date() }, tx);
  }

  /**
   * Update password hash
   */
  async updatePassword(id: number, passwordHash: string, tx?: Transaction) {
    return await this.update(id, { passwordHash, updatedAt: new Date() }, tx);
  }

  /**
   * Update user profile and return formatted response
   */
  async updateProfile(id: number, data: { name?: string; bio?: string }) {
    const user = await this.update(id, { ...data, updatedAt: new Date() });

    if (!user) throw new NotFoundException("Cannot update user");

    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}

// Export singleton instance
export const UserRepository = new UserRepositoryClass();
