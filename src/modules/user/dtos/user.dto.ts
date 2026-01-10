/**
 * User DTO
 */

import { t } from "elysia";

export const user = t.Object({
  id: t.Number(),
  email: t.String(),
  name: t.Optional(t.Nullable(t.String())),
  bio: t.Optional(t.Nullable(t.String())),
  emailVerified: t.Optional(t.Nullable(t.Boolean())),
  createdAt: t.String({ format: "date-time" }),
  updatedAt: t.String({ format: "date-time" }),
});

export type UserDto = typeof user.static;

export const itemResponse = t.Object({
  success: t.Literal(true),
  data: user,
});

export type ItemResponse = typeof itemResponse.static;
