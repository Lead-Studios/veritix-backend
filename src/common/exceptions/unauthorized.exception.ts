import { BaseDomainException } from './base.exception';

export class UnauthorizedDomainException extends BaseDomainException {
  constructor() {
    super('Unauthorized access', 'UNAUTHORIZED');
  }
}
