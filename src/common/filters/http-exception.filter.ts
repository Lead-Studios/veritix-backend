import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { BaseDomainException } from '../exceptions/base.exception';
import { mapDomainErrorToHttp } from '../utils/error-mapper';

export interface ApiErrorResponse {
  success: false;
  error: string;
  statusCode: number;
  timestamp: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Domain Exceptions — preserve existing code/metadata fields
    if (exception instanceof BaseDomainException) {
      const statusCode = mapDomainErrorToHttp(exception);

      response.status(statusCode).json({
        success: false,
        error: exception.message,
        statusCode,
        timestamp: new Date().toISOString(),
        ...(exception.code && { code: exception.code }),
        ...(exception.metadata && { metadata: exception.metadata }),
      });
      return;
    }

    // NestJS HTTP Exceptions (ValidationPipe errors, guards, etc.)
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // ValidationPipe returns an object with a `message` array — flatten it
      let error: string;
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const msg = (exceptionResponse as { message: string | string[] })
          .message;
        error = Array.isArray(msg) ? msg.join('; ') : msg;
      } else if (typeof exceptionResponse === 'string') {
        error = exceptionResponse;
      } else {
        error = exception.message;
      }

      response.status(statusCode).json({
        success: false,
        error,
        statusCode,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Unknown / unhandled errors
    console.error('UNHANDLED ERROR:', exception);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Internal server error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
    });
  }
}
