import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),
  ACCESS_TOKEN_SECRET: Joi.string().min(32).required(),
  REFRESH_TOKEN_SECRET: Joi.string().min(32).required(),
  ACCESS_TOKEN_EXPIRATION: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
  ORDER_EXPIRY_MINUTES: Joi.number().default(15),
  STELLAR_PLATFORM_ADDRESS: Joi.string().optional(),
  SENDGRID_API_KEY: Joi.string().optional(),
  SENDGRID_FROM_EMAIL: Joi.string().email().optional(),
});
