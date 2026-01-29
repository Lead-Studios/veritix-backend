import { BaseDomainException } from './base.exception';

export class NotFoundDomainException extends BaseDomainException {
  constructor(entity: string, id?: string) {
    super(`${entity} not found`, 'NOT_FOUND', { entity, id });
  }
}
