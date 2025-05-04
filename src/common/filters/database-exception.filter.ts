import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  Logger,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { QueryFailedError, EntityNotFoundError } from "typeorm";
import { ErrorResponse } from "../interfaces/error-response.interface";
import { DatabaseException } from "../exceptions";

@Catch(QueryFailedError, EntityNotFoundError, DatabaseException)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(
    exception: QueryFailedError | EntityNotFoundError | DatabaseException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = randomUUID();
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Database operation failed";
    let errorCode: string | null = null;
    let field = "unknown_field";

    if (exception instanceof QueryFailedError) {
      statusCode = HttpStatus.BAD_REQUEST;
      const pgError = exception as any;
      const detail = pgError.detail as string;

      if (detail) {
        const match = detail.match(/\((['"]?)([^'"]+)\1\)=\([^)]+\)/);
        if (match) {
          field = match[2];
        }
      }

      switch (pgError.code) {
        case "23505":
          message = `Duplicate entry found (violates unique constraint) for: ${field}`;
          errorCode = "UNIQUE_VIOLATION";
          statusCode = HttpStatus.CONFLICT;
          break;
        case "23503":
          message = `Referenced resource not found (foreign key violation) for: ${field}`;
          errorCode = "FOREIGN_KEY_VIOLATION";
          statusCode = HttpStatus.BAD_REQUEST;
          break;
        case "23502":
          message = `Missing required field (NOT NULL constraint failed) for: ${field}`;
          errorCode = "NOT_NULL_VIOLATION";
          statusCode = HttpStatus.BAD_REQUEST;
          break;
        case "23514":
          message = `Data failed validation (CHECK constraint violation) for: ${field}`;
          errorCode = "CHECK_VIOLATION";
          statusCode = HttpStatus.BAD_REQUEST;
          break;
        case "22001":
          message = `Input too long for column (value too large) for: ${field}`;
          errorCode = "STRING_TRUNCATION";
          statusCode = HttpStatus.BAD_REQUEST;
          break;
        default:
          message = pgError.message;
          errorCode = pgError.code;
          break;
      }
    } else if (exception instanceof EntityNotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
      message = `Resource not found for: ${field}`;
      errorCode = "ENTITY_NOT_FOUND";
      statusCode = HttpStatus.NOT_FOUND;
    } else if (exception instanceof DatabaseException) {
      // Use the status from the custom exception
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || message;
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error: "Database Error",
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // Add database-specific error code if available
    if (errorCode) {
      (errorResponse as any).errorCode = errorCode;
      (errorResponse as any).field = field;
    }

    this.logger.error(
      `${requestId} - Database Error: ${request.method} ${request.url} - ${message}`,
      exception instanceof Error ? exception.stack : "",
    );

    response.status(statusCode).json(errorResponse);
  }
}
