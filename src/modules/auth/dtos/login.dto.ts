/**
 * Login DTO
 */

import { t } from "elysia";

export const loginBody = t.Object({
  email: t.String({ format: "email" }),
  password: t.String(),
});

export type LoginBody = typeof loginBody.static;

export const loginResponse = t.Object({
  success: t.Literal(true),
  data: t.Object({
    token: t.String(),
    user: t.Object({
      id: t.Number(),
      email: t.String(),
      name: t.Optional(t.Nullable(t.String())),
    }),
  }),
});
