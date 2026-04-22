import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'staging')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  ACCESS_TOKEN_SECRET: Joi.string().min(32).required(),
  REFRESH_TOKEN_SECRET: Joi.string().min(32).required(),
  ACCESS_TOKEN_EXPIRATION: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
});
