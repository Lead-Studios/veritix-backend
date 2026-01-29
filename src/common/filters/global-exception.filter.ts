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

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Domain Exceptions
    if (exception instanceof BaseDomainException) {
      const status = mapDomainErrorToHttp(exception);

      return response.status(status).json({
        success: false,
        code: exception.code,
        message: exception.message,
        metadata: exception.metadata ?? null,
        timestamp: new Date().toISOString(),
      });
    }

    // Nest Http Exceptions
    if (exception instanceof HttpException) {
      return response.status(exception.getStatus()).json({
        success: false,
        message: exception.message,
      });
    }

    // Unknown Errors
    console.error('UNHANDLED ERROR:', exception);

    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
