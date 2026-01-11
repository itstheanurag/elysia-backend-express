/**
 * Request ID Plugin
 * Generates unique request IDs for tracing and correlation
 */

import { Elysia } from "elysia";
import { nanoid } from "nanoid";

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Request ID plugin
 *
 * Generates or preserves request IDs for distributed tracing.
 * - Respects incoming X-Request-ID header
 * - Generates new ID if not present
 * - Adds request ID to response headers
 * - Injects requestId into context for logging
 *
 * @example
 * ```ts
 * const app = new Elysia()
 *   .use(requestIdPlugin())
 *   .get('/', ({ requestId }) => {
 *     logger.info({ requestId }, 'Processing request');
 *     return { requestId };
 *   });
 * ```
 */
export const requestIdPlugin = () =>
  new Elysia({ name: "plugin-request-id" }).derive(({ request, set }) => {
    // Check for existing request ID from client or upstream proxy
    const existingId = request.headers.get(REQUEST_ID_HEADER);
    const requestId = existingId || nanoid(21);

    // Add request ID to response headers
    set.headers[REQUEST_ID_HEADER] = requestId;

    return { requestId };
  });

export { REQUEST_ID_HEADER };
