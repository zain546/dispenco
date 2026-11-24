import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(4000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string()
        .min(32)
        .invalid(
          'dispenco_secret_key_change_in_prod',
          'your-secret-key-change-in-production',
          'generate-a-strong-random-secret-key-for-jwt',
        ),
    })
    .required(),
  REFRESH_TOKEN_SECRET: Joi.string()
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.string()
        .min(32)
        .invalid(
          Joi.ref('JWT_SECRET'),
          'generate-a-strong-random-refresh-secret-for-jwt',
        ),
    })
    .invalid(Joi.ref('JWT_SECRET'))
    .required(),
  REDIS_URL: Joi.string().required(),
  CLIENT_URL: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .pattern(/^https:\/\/[^*\s]+(?:,\s*https:\/\/[^*\s]+)*$/)
      .required(),
    otherwise: Joi.string().default('http://localhost:3000'),
  }),
});
