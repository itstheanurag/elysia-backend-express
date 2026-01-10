/**
 * Documentation Factory
 * Creates OpenAPI documentation with configurable provider (Scalar/Swagger)
 */

import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { DocsConfig } from "@/config/config.type";

export interface DocsFactoryOptions extends Omit<DocsConfig, "provider"> {
  provider: "scalar" | "swaggerui";
  tags?: Array<{
    name: string;
    description: string;
  }>;
  servers?: Array<{
    url: string;
    description?: string;
  }>;
}

/**
 * Creates an OpenAPI documentation plugin
 *
 * @example
 * ```ts
 * const app = new Elysia()
 *   .use(createDocs({
 *     enabled: true,
 *     provider: 'scalar',
 *     path: '/docs',
 *     title: 'My API',
 *     version: '1.0.0',
 *     description: 'API Description'
 *   }))
 * ```
 */
export const createDocs = (options: DocsFactoryOptions) => {
  if (!options.enabled) {
    return new Elysia({ name: "core-docs-disabled" });
  }

  return openapi({
    path: options.path,
    // @ts-expect-error - provider types may differ between versions
    provider: options.provider,
    documentation: {
      info: {
        title: options.title ?? process.env.npm_package_name,
        version: options.version ?? process.env.npm_package_version,
        description: options.description ?? process.env.npm_package_description,
      },
      tags: options.tags || [
        { name: "Health", description: "Health check endpoints" },
        {
          name: "Authentication",
          description: "User authentication endpoints",
        },
        { name: "Users", description: "User management endpoints" },
        { name: "Examples", description: "Example endpoints" },
      ],
      servers: options.servers,
    },
    // Scalar-specific configuration
    scalar: {
      theme: "kepler",
      layout: "modern",
      darkMode: true,
      hideModels: false,
      hideDownloadButton: false,
      showSidebar: true,
    },
    // Swagger-specific configuration
    swagger: {
      displayOperationId: false,
      defaultModelsExpandDepth: 3,
      docExpansion: "list",
      filter: true,
      showExtensions: false,
      showCommonExtensions: false,
    },
  });
};

export const docsPlugin = createDocs;
