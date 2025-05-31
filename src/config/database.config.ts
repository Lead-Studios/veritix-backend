import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: process.env.DB_TYPE || 'postgres',
  url: process.env.DB_URL || '',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASWORD || 'password',
  database: process.env.DB_NAME || 'veritix',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
}));
