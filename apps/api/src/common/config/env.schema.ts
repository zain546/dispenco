import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(4000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  REFRESH_TOKEN_SECRET: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  CLIENT_URL: Joi.string().default('http://localhost:3000'),
});
