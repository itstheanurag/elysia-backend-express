/**
 * Core Exports
 */

export {
  createServer,
  createModule,
  createPlugin,
  gracefulShutdown,
} from "./server.factory";
export { createDocs, docsPlugin } from "./docs.factory";

export {
  logger,
  createLogger,
  httpLogger,
  eventLogger,
  logEvent,
  logError,
} from "./logger";

// HTTP Exception
export {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  MethodNotAllowedException,
  ConflictException,
  GoneException,
  UnprocessableEntityException,
  TooManyRequestsException,
  InternalServerException,
  NotImplementedException,
  BadGatewayException,
  ServiceUnavailableException,
  GatewayTimeoutException,
} from "./exceptions";

export type { DocsFactoryOptions } from "./docs.factory";
export type {
  ServerFactoryOptions,
  GracefulShutdownOptions,
} from "./server.factory";
export type { Logger } from "./logger";
export type { HttpExceptionDetails } from "./exceptions";
