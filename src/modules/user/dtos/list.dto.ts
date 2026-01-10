/**
 * User List DTO
 */

import { t } from "elysia";
import { user } from "./user.dto";

export const listQuery = t.Object({
  page: t.Optional(t.Number({ default: 1, minimum: 1 })),
  limit: t.Optional(t.Number({ default: 10, minimum: 1, maximum: 100 })),
  search: t.Optional(t.String()),
});

export type ListQuery = typeof listQuery.static;

export const listResponse = t.Object({
  data: t.Array(user),
  meta: t.Object({
    page: t.Number(),
    limit: t.Number(),
    total: t.Number(),
    totalPages: t.Number(),
  }),
});

export type ListResponse = typeof listResponse.static;
