/**
 * Example Controller
 * HTTP routes for the example module
 */

import { Elysia } from "elysia";
import { ExampleModel } from "./model";
import { ExampleService } from "./service";
import { NotFoundException } from "@core/exceptions";

export const exampleModule = new Elysia({
  name: "module-example",
  prefix: "/examples",
  detail: {
    tags: ["Examples"],
  },
})
  /**
   * List examples with pagination
   */
  .get(
    "",
    async ({ query }) => {
      return ExampleService.list(query);
    },
    {
      query: ExampleModel.listQuery,
      response: ExampleModel.listResponse,
      detail: {
        summary: "List examples",
        description:
          "Get a paginated list of example items with optional search",
      },
    }
  )

  /**
   * Get single example by ID
   */
  .get(
    "/:id",
    async ({ params, set }) => {
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
   * Update example
   */
  .patch(
    "/:id",
    async ({ params, body, set }) => {
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
    async ({ params, set }) => {
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
