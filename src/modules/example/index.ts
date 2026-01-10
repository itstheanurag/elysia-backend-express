/**
 * Example Controller
 * Simplified CRUD routes for the example module with rate limiting
 */

import { Elysia } from "elysia";
import { ExampleModel } from "./model";
import { ExampleService } from "./service";
import { NotFoundException } from "@core/exceptions";
import { testRateLimit } from "@plugins/rate-limit.plugin";

export const exampleModule = new Elysia({
  name: "module-example",
  prefix: "/examples",
  detail: {
    tags: ["Examples"],
  },
})
  // Apply standard API rate limit to all routes in this module
  .use(testRateLimit)

  /**
   * Get single example by ID
   */
  .get(
    "/:id",
    async ({ params }) => {
      const item = await ExampleService.getById(params.id);

      if (!item) {
        throw new NotFoundException("Example not found").withDetails({
          id: params.id,
        });
      }

      return {
        success: true as const,
        data: item,
      };
    },
    {
      params: ExampleModel.idParam,
      response: ExampleModel.itemResponse,
      detail: {
        summary: "Get example",
        description: "Get a single example item by ID",
      },
    }
  )

  /**
   * Create new example
   */
  .post(
    "",
    async ({ body }) => {
      const item = await ExampleService.create(body);

      return {
        success: true as const,
        data: item,
      };
    },
    {
      body: ExampleModel.createBody,
      response: ExampleModel.itemResponse,
      detail: {
        summary: "Create example",
        description: "Create a new example item",
      },
    }
  )

  /**
   * Update example (PUT)
   */
  .put(
    "/:id",
    async ({ params, body }) => {
      const item = await ExampleService.update(params.id, body);

      if (!item) {
        throw new NotFoundException("Example not found").withDetails({
          id: params.id,
        });
      }

      return {
        success: true as const,
        data: item,
      };
    },
    {
      params: ExampleModel.idParam,
      body: ExampleModel.updateBody,
      response: ExampleModel.itemResponse,
      detail: {
        summary: "Update example",
        description: "Update an existing example item",
      },
    }
  )

  /**
   * Delete example
   */
  .delete(
    "/:id",
    async ({ params }) => {
      const deleted = await ExampleService.delete(params.id);

      if (!deleted) {
        throw new NotFoundException("Example not found").withDetails({
          id: params.id,
        });
      }

      return {
        success: true as const,
        message: "Example deleted successfully",
      };
    },
    {
      params: ExampleModel.idParam,
      response: ExampleModel.successMessage,
      detail: {
        summary: "Delete example",
        description: "Delete an example item",
      },
    }
  );
