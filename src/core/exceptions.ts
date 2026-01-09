/**
 * HTTP Exceptions
 * Throwable HTTP error classes with builder pattern
 *
 * @example
 * throw new NotFoundException("User not found").withDetails({ userId: "123" });
 * throw new UnauthorizedException("Invalid credentials");
 * throw new BadRequestException("Email is required").withCode("VALIDATION_ERROR");
 */

export interface HttpExceptionDetails {
  [key: string]: unknown;
}

export class HttpException extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly timestamp: string;
  public details?: HttpExceptionDetails;
  public includeStack: boolean = false;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR"
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace?.(this, this.constructor);
  }

  /** Include stack trace in response (use in development only) */
  withStack(): this {
    this.includeStack = true;
    return this;
  }

  /** Add additional details to the error response */
  withDetails(details: HttpExceptionDetails): this {
    this.details = details;
    return this;
  }

  /** Override the error code */
  withCode(code: string): this {
    (this as { code: string }).code = code;
    return this;
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      ...(this.details && { details: this.details }),
      ...(this.includeStack && { stack: this.stack }),
    };
  }
}


/** 400 Bad Request */
export class BadRequestException extends HttpException {
  constructor(message = "Bad Request") {
    super(message, 400, "BAD_REQUEST");
  }
}

/** 401 Unauthorized */
export class UnauthorizedException extends HttpException {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

/** 403 Forbidden */
export class ForbiddenException extends HttpException {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

/** 404 Not Found */
export class NotFoundException extends HttpException {
  constructor(message = "Not Found") {
    super(message, 404, "NOT_FOUND");
  }
}

/** 405 Method Not Allowed */
export class MethodNotAllowedException extends HttpException {
  constructor(message = "Method Not Allowed") {
    super(message, 405, "METHOD_NOT_ALLOWED");
  }
}

/** 409 Conflict */
export class ConflictException extends HttpException {
  constructor(message = "Conflict") {
    super(message, 409, "CONFLICT");
  }
}

/** 410 Gone */
export class GoneException extends HttpException {
  constructor(message = "Gone") {
    super(message, 410, "GONE");
  }
}

/** 422 Unprocessable Entity */
export class UnprocessableEntityException extends HttpException {
  constructor(message = "Unprocessable Entity") {
    super(message, 422, "UNPROCESSABLE_ENTITY");
  }
}

/** 429 Too Many Requests */
export class TooManyRequestsException extends HttpException {
  constructor(message = "Too Many Requests") {
    super(message, 429, "TOO_MANY_REQUESTS");
  }
}



/** 500 Internal Server Error */
export class InternalServerException extends HttpException {
  constructor(message = "Internal Server Error") {
    super(message, 500, "INTERNAL_ERROR");
  }
}

/** 501 Not Implemented */
export class NotImplementedException extends HttpException {
  constructor(message = "Not Implemented") {
    super(message, 501, "NOT_IMPLEMENTED");
  }
}

/** 502 Bad Gateway */
export class BadGatewayException extends HttpException {
  constructor(message = "Bad Gateway") {
    super(message, 502, "BAD_GATEWAY");
  }
}

/** 503 Service Unavailable */
export class ServiceUnavailableException extends HttpException {
  constructor(message = "Service Unavailable") {
    super(message, 503, "SERVICE_UNAVAILABLE");
  }
}

/** 504 Gateway Timeout */
export class GatewayTimeoutException extends HttpException {
  constructor(message = "Gateway Timeout") {
    super(message, 504, "GATEWAY_TIMEOUT");
  }
}
