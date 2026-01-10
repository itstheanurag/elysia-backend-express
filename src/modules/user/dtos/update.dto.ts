/**
 * User Update DTO
 */

import { t } from "elysia";

export const updateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
  bio: t.Optional(t.String({ maxLength: 1000 })),
});

export const idParam = t.Object({
  id: t.Number(),
});

export type IdParam = typeof idParam.static;

export const successMessage = t.Object({
  success: t.Literal(true),
  message: t.String(),
});

export type SuccessMessage = typeof successMessage.static;
export type UpdateBody = typeof updateBody.static;
