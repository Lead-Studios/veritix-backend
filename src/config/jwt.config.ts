import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  // secret: process.env.JWT_SECRET || "veritixisgivingmeheadache",
  secret: String(process.env.JWT_SECRET) || 'veritixisgivingmeheadache',
  resetPasswordSecret: String(process.env.JWT_PWD_SECRET),
  audience: process.env.JWT_TOKEN_AUDIENCE || 'FE_SERVER',
  issuer: process.env.JWT_TOKEN_ISSUER || 'BE_SERVER',
  expiresIn: process.env.JWT_EXPIRATION || '3600s',
  passwordExpiresIn: process.env.JWT_PWD_EXPIN || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_TOKEN_TTL || '7d',
  verificationExpiresIn: process.env.JWT_VERIFICATION_TOKEN_TTL || '30m',
}));
