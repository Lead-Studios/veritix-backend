import { SetMetadata } from '@nestjs/common';

export const TENANT_REPOSITORY_ENTITY = 'TENANT_REPOSITORY_ENTITY';

export function TenantRepository(entity: Function) {
  return SetMetadata(TENANT_REPOSITORY_ENTITY, entity);
}
