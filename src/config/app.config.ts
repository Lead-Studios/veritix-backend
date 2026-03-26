import * as Joi from 'joi';

export const appConfigValidationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development')
    .description('Application environment.'),
  PORT: Joi.number().default(3000).description('HTTP port to listen on.'),
  APP_NAME: Joi.string().optional().description('Application name.'),

  // Auth tokens
  ACCESS_TOKEN_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret key for signing access JWTs (min 32 chars).'),
  REFRESH_TOKEN_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret key for signing refresh JWTs (min 32 chars).'),
  ACCESS_TOKEN_EXPIRATION: Joi.string()
    .default('1h')
    .description('Access token expiration (e.g. 1h, 15m).'),
  REFRESH_TOKEN_EXPIRATION: Joi.string()
    .default('7d')
    .description('Refresh token expiration (e.g. 7d, 30d).'),

  // SendGrid
  SENDGRID_API_KEY: Joi.string()
    .optional()
    .description('SendGrid API key for sending transactional emails.'),
  SENDGRID_FROM_EMAIL: Joi.string()
    .email()
    .optional()
    .description('Verified sender email address for SendGrid.'),

  // CORS
  ALLOWED_ORIGINS: Joi.string()
    .optional()
    .description(
      'Comma-separated list of allowed CORS origins (e.g. https://app.veritix.io).',
    ),

  // Stellar
  STELLAR_NETWORK: Joi.string()
    .valid('testnet', 'mainnet')
    .default('testnet')
    .description('Stellar network to use. Defaults to testnet.'),
  STELLAR_RECEIVING_ADDRESS: Joi.string()
    .optional()
    .description('Platform Stellar receiving address for payments.'),
  STELLAR_PLATFORM_ADDRESS: Joi.string()
    .optional()
    .description(
      'Alias for STELLAR_RECEIVING_ADDRESS (used by payment listener).',
    ),
  STELLAR_SECRET_KEY: Joi.string()
    .optional()
    .description(
      'Platform Stellar secret key — NEVER log or expose this value.',
    ),

  // Orders
  ORDER_EXPIRY_MINUTES: Joi.number()
    .default(15)
    .description('Minutes before an unpaid order expires.'),
}).unknown(true); // Allow other env vars not declared here

export default () => ({
  appName: process.env.APP_NAME,
  stellarSecretKey: process.env.STELLAR_SECRET_KEY,
  stellar: {
    network: process.env.STELLAR_NETWORK ?? 'testnet',
    receivingAddress:
      process.env.STELLAR_RECEIVING_ADDRESS ??
      process.env.STELLAR_PLATFORM_ADDRESS ??
      '',
  },
  orderExpiryMinutes: parseInt(process.env.ORDER_EXPIRY_MINUTES || '15', 10),
});
