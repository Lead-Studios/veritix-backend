import 'reflect-metadata';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: process.env.DATABASE_SSL === 'true',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
