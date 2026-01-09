/**
 * Example Model
 * Validation schemas and TypeScript types
 */

import { t } from "elysia";

export namespace ExampleModel {
  // List query parameters
  export const listQuery = t.Object({
    page: t.Optional(t.Number({ default: 1, minimum: 1 })),
    limit: t.Optional(t.Number({ default: 10, minimum: 1, maximum: 100 })),
    search: t.Optional(t.String()),
  });
  export type ListQuery = typeof listQuery.static;

  // Single item
  export const item = t.Object({
    id: t.String(),
    name: t.String(),
    description: t.Optional(t.String()),
    createdAt: t.String({ format: "date-time" }),
    updatedAt: t.String({ format: "date-time" }),
  });

  export type Item = typeof item.static;

  // List response
  export const listResponse = t.Object({
    data: t.Array(item),
    meta: t.Object({
      page: t.Number(),
      limit: t.Number(),
      total: t.Number(),
      totalPages: t.Number(),
    }),
  });

  export type ListResponse = typeof listResponse.static;

  // Single item response
  export const itemResponse = t.Object({
    data: item,
  });
  export type ItemResponse = typeof itemResponse.static;

  // Create body
  export const createBody = t.Object({
    name: t.String({ minLength: 1, maxLength: 100 }),
    description: t.Optional(t.String({ maxLength: 500 })),
  });
  export type CreateBody = typeof createBody.static;

  // Update body
  export const updateBody = t.Partial(createBody);
  export type UpdateBody = typeof updateBody.static;

  // ID param
  export const idParam = t.Object({
    id: t.String(),
  });
  export type IdParam = typeof idParam.static;

  // Success message
  export const successMessage = t.Object({
    message: t.String(),
  });

  export type SuccessMessage = typeof successMessage.static;
}
