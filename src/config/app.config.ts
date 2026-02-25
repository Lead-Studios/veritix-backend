import * as Joi from 'joi';

export const appConfigValidationSchema = Joi.object({
  // App
  APP_NAME: Joi.string().optional(),

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
});
