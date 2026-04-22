import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  runMigrations: true,
  migrationsTableName: 'migrations',
  migrations: ['src/migrations/*.ts'],
  entities: ['src/**/*.entity.ts'],
});
