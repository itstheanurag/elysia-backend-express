/**
 * CORS Plugin
 * Configures Cross-Origin Resource Sharing
 */

import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import type { CorsConfig } from "@config/index";

export const corsPlugin = (config: CorsConfig) =>
  new Elysia({ name: "plugin-cors" }).use(
    cors({
      origin: config.origin,
      credentials: config.credentials,
      methods: config.methods,
      allowedHeaders: config.allowedHeaders,
    })
  );
