import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { getTenantId } from '../../common/context/tenant.context';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

// Base DataSource options, without a specific schema
const baseDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [isProd ? 'dist/**/*.entity.js' : 'src/**/*.entity.ts'],
  migrations: [isProd ? 'dist/database/migrations/*.js' : 'src/database/migrations/*.ts'],
  synchronize: false,
};

export const getTenantDataSource = (): DataSource => {
  const tenantId = getTenantId();
  if (!tenantId) {
    // For shared entities (e.g., 'organizers' table) or global operations
    // You might want to return a default DataSource or throw an error
    // For now, we'll assume 'public' schema for non-tenant specific operations
    return new DataSource({
      ...baseDataSourceOptions,
      schema: 'public',
    });
  }

  // For tenant-specific operations, set the schema dynamically
  return new DataSource({
    ...baseDataSourceOptions,
    schema: `tenant_${tenantId}`,
  });
};

// This is the main application data source, typically for global entities or initial setup
export const AppDataSource = new DataSource({
  ...baseDataSourceOptions,
  schema: 'public', // Default schema for global entities
});
