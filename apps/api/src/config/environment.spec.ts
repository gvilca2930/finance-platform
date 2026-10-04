import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  const validEnvironment = {
    NODE_ENV: 'test',
    PORT: '3001',
    DATABASE_URL: 'postgresql://user:password@localhost:5432/finance_db',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '30d',
    CORS_ORIGINS: 'http://localhost:3000',
    SWAGGER_ENABLED: 'true',
  };

  it('parses a valid configuration', () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      NODE_ENV: 'test',
      PORT: 3001,
      SWAGGER_ENABLED: true,
    });
  });

  it('rejects weak secrets', () => {
    expect(() => validateEnvironment({ ...validEnvironment, JWT_ACCESS_SECRET: 'short' })).toThrow(
      'Invalid environment configuration',
    );
  });

  it('keeps Swagger disabled when the setting is omitted', () => {
    expect(
      validateEnvironment({ ...validEnvironment, SWAGGER_ENABLED: undefined }).SWAGGER_ENABLED,
    ).toBe(false);
  });

  it('rejects equal access and refresh secrets', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        JWT_REFRESH_SECRET: validEnvironment.JWT_ACCESS_SECRET,
      }),
    ).toThrow('Invalid environment configuration');
  });

  it('rejects invalid token durations and wildcard CORS', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, JWT_ACCESS_EXPIRES_IN: 'tomorrow' }),
    ).toThrow('Invalid environment configuration');
    expect(() => validateEnvironment({ ...validEnvironment, CORS_ORIGINS: '*' })).toThrow(
      'Invalid environment configuration',
    );
  });
});
