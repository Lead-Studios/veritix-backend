import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { ErrorResponse } from "../interfaces/error-response.interface";

@Catch(UnauthorizedException, ForbiddenException)
export class AuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthExceptionFilter.name);

  catch(
    exception: UnauthorizedException | ForbiddenException,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = randomUUID();
    const statusCode = exception.getStatus();

    let message: string;
    let error: string;

    if (exception instanceof UnauthorizedException) {
      message = "Authentication required";
      error = "Unauthorized";
    } else {
      message = "Access denied";
      error = "Forbidden";
    }

    // Override with custom message if provided
    const exceptionResponse = exception.getResponse();
    if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
      if ((exceptionResponse as any).message) {
        message = (exceptionResponse as any).message;
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    this.logger.error(
      `${requestId} - ${error}: ${request.method} ${request.url} - ${message}`,
    );

    response.status(statusCode).json(errorResponse);
  }
}
