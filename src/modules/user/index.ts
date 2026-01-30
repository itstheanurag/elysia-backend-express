/**
 * User Module
 * HTTP routes for user operations
 */

import { Elysia } from "elysia";
import { userRoutes } from "./routes";

export const userModule = new Elysia({
  name: "module-user",
  prefix: "/users",
  detail: {
    tags: ["Users"],
  },
}).use(userRoutes);

// Export services and repositories for use in other modules
export { UserService } from "./services";
export { UserRepository } from "./repositories";
