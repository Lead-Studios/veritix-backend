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

    if (exception instanceof QueryFailedError) {
      statusCode = HttpStatus.BAD_REQUEST;
      // Detecting specific database errors
      if ((exception as any).code === "23505") {
        // Unique violation in Postgres
        message = "Duplicate entry found";
        errorCode = "UNIQUE_VIOLATION";
      } else if ((exception as any).code === "23503") {
        // Foreign key violation
        message = "Referenced resource not found";
        errorCode = "FOREIGN_KEY_VIOLATION";
      }
    } else if (exception instanceof EntityNotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
      message = "Resource not found";
      errorCode = "ENTITY_NOT_FOUND";
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
    }

    this.logger.error(
      `${requestId} - Database Error: ${request.method} ${request.url} - ${message}`,
      exception instanceof Error ? exception.stack : "",
    );

    response.status(statusCode).json(errorResponse);
  }
}
