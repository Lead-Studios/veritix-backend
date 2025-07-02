import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

const rootDir = process.cwd();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(rootDir, 'src/**/*.entity.{ts,js}')],
  migrations: [join(rootDir, 'src/database/migrations/*.{ts,js}')],
  synchronize: false,
}); 