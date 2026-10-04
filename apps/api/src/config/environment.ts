import { z } from 'zod';

const tokenDurationSchema = z.string().regex(/^\d+(?:ms|s|m|h|d|w|y)$/, {
  message: 'must be a duration such as 15m or 30d',
});

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATABASE_URL: z.string().url().startsWith('postgresql://'),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: tokenDurationSchema,
    JWT_REFRESH_EXPIRES_IN: tokenDurationSchema,
    CORS_ORIGINS: z
      .string()
      .min(1)
      .superRefine((value, context) => {
        for (const origin of value.split(',').map((item) => item.trim())) {
          if (origin === '*') {
            context.addIssue({
              code: 'custom',
              message: 'cannot contain * when credentials are enabled',
            });
            continue;
          }

          try {
            const url = new URL(origin);
            if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) {
              throw new Error('Invalid origin');
            }
          } catch {
            context.addIssue({
              code: 'custom',
              message: 'must contain valid comma-separated origins',
            });
          }
        }
      }),
    SWAGGER_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .refine((environment) => environment.JWT_ACCESS_SECRET !== environment.JWT_REFRESH_SECRET, {
    message: 'access and refresh secrets must be different',
    path: ['JWT_REFRESH_SECRET'],
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(configuration: Record<string, unknown>): Environment {
  const result = environmentSchema.safeParse(configuration);

  if (!result.success) {
    throw new Error(`Invalid environment configuration: ${z.prettifyError(result.error)}`);
  }

  return result.data;
}
