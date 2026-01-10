/**
 * Password Reset DTOs
 */

import { t } from "elysia";

export const forgotPasswordBody = t.Object({
  email: t.String({ format: "email" }),
});

export type ForgotPasswordBody = typeof forgotPasswordBody.static;

export const forgotPasswordResponse = t.Object({
  success: t.Literal(true),
  message: t.String(),
});

export const resetPasswordBody = t.Object({
  token: t.String({ format: "uuid" }),
  password: t.String({ minLength: 8, maxLength: 100 }),
});

export type ResetPasswordBody = typeof resetPasswordBody.static;

export const resetPasswordResponse = t.Object({
  success: t.Literal(true),
  message: t.String(),
});
