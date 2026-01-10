/**
 * Signup DTO
 */

import { t } from "elysia";

export const signupBody = t.Object({
  email: t.String({ format: "email" }),
  password: t.String({ minLength: 8, maxLength: 100 }),
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
});

export type SignupBody = typeof signupBody.static;

export const signupResponse = t.Object({
  success: t.Literal(true),
  message: t.String(),
  data: t.Object({
    id: t.Number(),
    email: t.String(),
    name: t.Optional(t.Nullable(t.String())),
  }),
});
