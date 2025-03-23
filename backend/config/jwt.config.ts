import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'your_default_secret',
  audience: process.env.JWT_TOKEN_AUDIENCE || 'your_audience',
  issuer: process.env.JWT_TOKEN_ISSUER || 'your_issuer',
  // Use string values directly
  expiresIn: process.env.JWT_EXPIRATION || '1h',
  refreshExpiresIn: process.env.JWT_REFRESH_TOKEN_TTL || '90d',
}));