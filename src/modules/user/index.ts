/**
 * User Module
 * HTTP routes for user operations
 */

import { Elysia } from "elysia";
import {
  listQuery,
  listResponse,
  itemResponse,
  updateBody,
  idParam,
  successMessage,
} from "./dtos";
import { UserService } from "./service";
import { NotFoundException } from "@core/exceptions";

export const userModule = new Elysia({
  name: "module-user",
  prefix: "/users",
  detail: {
    tags: ["Users"],
  },
})
  /**
   * List users with pagination
   */
  .get(
    "",
    async ({ query }) => {
      return UserService.list(query);
    },
    {
      query: listQuery,
      response: listResponse,
      detail: {
        summary: "List users",
        description: "Get a paginated list of users with optional search",
      },
    }
  )

  /**
   * Get single user by ID
   */
  .get(
    "/:id",
    async ({ params }) => {
      const user = await UserService.getById(params.id);

      if (!user) {
        throw new NotFoundException("User not found");
      }

      return {
        success: true as const,
        data: user,
      };
    },
    {
      params: idParam,
      response: itemResponse,
      detail: {
        summary: "Get user",
        description: "Get a single user by ID",
      },
    }
  )

  /**
   * Update user profile
   */
  .patch(
    "/:id",
    async ({ params, body }) => {
      const user = await UserService.update(params.id, body);

      if (!user) {
        throw new NotFoundException("User not found");
      }

      return {
        success: true as const,
        data: user,
      };
    },
    {
      params: idParam,
      body: updateBody,
      response: itemResponse,
      detail: {
        summary: "Update user",
        description: "Update user profile information",
      },
    }
  )

  /**
   * Delete user
   */
  .delete(
    "/:id",
    async ({ params }) => {
      const deleted = await UserService.delete(params.id);

      if (!deleted) {
        throw new NotFoundException("User not found");
      }

      return {
        success: true as const,
        message: "User deleted successfully",
      };
    },
    {
      params: idParam,
      response: successMessage,
      detail: {
        summary: "Delete user",
        description: "Delete a user account",
      },
    }
  );
