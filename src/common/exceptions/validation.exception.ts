import { BaseDomainException } from './base.exception';

export class ValidationDomainException extends BaseDomainException {
  constructor(message: string, fields?: any) {
    super(message, 'VALIDATION_ERROR', { fields });
  }
}
