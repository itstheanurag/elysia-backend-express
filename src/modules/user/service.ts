/**
 * User Service
 * Business logic for user operations
 */

import { UserRepository } from "./repository";
import { logEvent } from "@core/logger";
import { NotFoundException } from "@core/exceptions";
import type { ListQuery, UpdateBody } from "./dtos";

// Helper to format user for API response
function formatUser(user: {
  id: number;
  email: string;
  name: string | null;
  bio: string | null;
  emailVerified: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    bio: user.bio,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export abstract class UserService {
  /**
   * List users with pagination
   */
  static async list(query: ListQuery) {
    const result = query.search
      ? await UserRepository.search(query.search, {
          page: query.page,
          limit: query.limit,
        })
      : await UserRepository.findAll({
          page: query.page,
          limit: query.limit,
        });

    return {
      data: result.data.map(formatUser),
      meta: result.meta,
    };
  }

  /**
   * Get single user by ID
   */
  static async getById(id: number) {
    const user = await UserRepository.findById(id);

    if (!user) throw new NotFoundException("User not found");

    return formatUser(user);
  }

  /**
   * Update user profile
   */
  static async update(id: number, data: UpdateBody) {
    const user = await UserRepository.updateProfile(id, data);

    if (!user) throw new NotFoundException("Cannot update user");

    logEvent("user.updated", { userId: id });
    return user;
  }

  /**
   * Delete user
   */
  static async delete(id: number): Promise<boolean> {
    const deleted = await UserRepository.delete(id);

    if (!deleted) throw new NotFoundException("Cannot delete user");

    logEvent("user.deleted", { userId: id });
    return deleted;
  }
}
