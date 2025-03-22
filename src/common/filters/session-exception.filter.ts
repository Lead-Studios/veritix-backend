import { ExceptionFilter, Catch, ArgumentsHost, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { ErrorResponse } from "../interfaces/error-response.interface";
import { SessionException } from "../exceptions";

@Catch(SessionException)
export class SessionExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SessionExceptionFilter.name);

  catch(exception: SessionException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = randomUUID();
    const statusCode = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    let message = "Session expired";

    if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
      message = (exceptionResponse as any).message || message;
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error: "Session Error",
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    this.logger.error(
      `${requestId} - Session Error: ${request.method} ${request.url} - ${message}`,
    );

    response.status(statusCode).json(errorResponse);
  }
}
