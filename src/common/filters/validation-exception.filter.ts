import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { ErrorResponse } from "../interfaces/error-response.interface";
import { ValidationException } from "../exceptions";

@Catch(BadRequestException, ValidationException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(
    exception: BadRequestException | ValidationException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = randomUUID();
    const statusCode = exception.getStatus();

    let message = "Validation failed";
    let validationErrors = [];

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
      message = (exceptionResponse as any).message || message;

      // Handle class-validator errors, which are typically in the 'message' property as an array
      if (Array.isArray((exceptionResponse as any).message)) {
        validationErrors = (exceptionResponse as any).message;
        message = "Validation failed";
      }

      // If we have explicit validation errors property from our custom exception
      if ((exceptionResponse as any).errors) {
        validationErrors = (exceptionResponse as any).errors;
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error: "Validation Error",
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    // Add validation errors if present
    if (validationErrors.length > 0) {
      (errorResponse as any).validationErrors = validationErrors;
    }

    this.logger.error(
      `${requestId} - Validation Error: ${request.method} ${request.url}`,
      JSON.stringify(errorResponse),
    );

    response.status(statusCode).json(errorResponse);
  }
}
