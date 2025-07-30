import { DynamicModule, Module, Provider } from '@nestjs/common';
import { getTenantDataSource } from './tenant-data-source';
import { TENANT_REPOSITORY_ENTITY } from './tenant-repository.decorator';
import { getRepositoryToken } from '@nestjs/typeorm';

@Module({})
export class TenantRepositoryModule {
  static forFeature(entities: Function[]): DynamicModule {
    const providers: Provider[] = [];

    for (const entity of entities) {
      providers.push({
        provide: getRepositoryToken(entity),
        useFactory: async () => {
          const dataSource = getTenantDataSource();
          if (!dataSource.isInitialized) {
            await dataSource.initialize();
          }
          return dataSource.getRepository(entity);
        },
      });
    }

    return {
      module: TenantRepositoryModule,
      providers: providers,
      exports: providers,
    };
  }
}
