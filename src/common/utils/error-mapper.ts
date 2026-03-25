import { HttpStatus } from '@nestjs/common';
import { BaseDomainException } from '../exceptions/base.exception';

export function mapDomainErrorToHttp(error: BaseDomainException) {
  switch (error.code) {
    case 'NOT_FOUND':
      return HttpStatus.NOT_FOUND;

    case 'VALIDATION_ERROR':
      return HttpStatus.BAD_REQUEST;

    case 'UNAUTHORIZED':
      return HttpStatus.UNAUTHORIZED;

    default:
      return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
