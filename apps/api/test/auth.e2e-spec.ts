import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request, { type Response } from 'supertest';
import { AppModule } from '../src/app.module';
import type { AccessTokenPayload, RefreshTokenPayload } from '../src/auth/types/auth-user';
import { PrismaService } from '../src/prisma/prisma.service';

interface LoginBody {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    profile: { firstName: string; paternalLastName: string };
  };
}

function responseBody<T>(response: Response): T {
  return response.body as T;
}

describe('Auth and users (e2e, PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let userId: string;
  let accessToken: string;
  let refreshToken: string;
  const email = `phase2-${Date.now()}@example.com`;
  const password = 'Secure123';

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);
    configService = app.get(ConfigService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { email } });
    }
    if (app) {
      await app.close();
    }
  });

  it('registers a normalized user, profile, and Argon2 password hash', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: email.toUpperCase(),
        password,
        firstName: 'Ana',
        paternalLastName: 'Pérez',
      })
      .expect(201);

    const body = responseBody<LoginBody['user']>(response);
    userId = body.id;
    expect(body).toMatchObject({
      email,
      status: 'ACTIVE',
      profile: {
        firstName: 'Ana',
        paternalLastName: 'Pérez',
        countryCode: 'PE',
        preferredCurrency: 'PEN',
        timezone: 'America/Lima',
        language: 'es',
      },
    });
    expect(body).not.toHaveProperty('passwordHash');

    const stored = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    expect(stored?.email).toBe(email);
    expect(stored?.passwordHash).not.toBe(password);
    await expect(argon2.verify(stored?.passwordHash ?? '', password)).resolves.toBe(true);
    expect(stored?.profile).not.toBeNull();
  });

  it('rejects duplicate email and invalid or unknown DTO properties', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'Otra', paternalLastName: 'Persona' })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid',
        password: 'weak',
        firstName: '',
        paternalLastName: 'Persona',
        role: 'ADMIN',
      })
      .expect(400);
  });

  it('returns generic 401 responses for bad password, missing user, and suspended user', async () => {
    const wrongPassword = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'Wrong123' })
      .expect(401);
    expect(responseBody<{ message: string }>(wrongPassword).message).toBe('Invalid credentials');

    const missingUser = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'missing@example.com', password })
      .expect(401);
    expect(responseBody<{ message: string }>(missingUser).message).toBe('Invalid credentials');

    await prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(401);
    await prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
  });

  it('logs in, updates lastLoginAt, and persists only a refresh-token hash', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: email.toUpperCase(), password })
      .expect(200);
    const body = responseBody<LoginBody>(response);
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;

    expect(accessToken).toEqual(expect.any(String));
    expect(refreshToken).toEqual(expect.any(String));
    expect(body.expiresIn).toBeGreaterThan(0);
    expect(body.user).not.toHaveProperty('passwordHash');

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.lastLoginAt).not.toBeNull();

    const refreshClaims = jwtService.decode<RefreshTokenPayload>(refreshToken);
    const session = await prisma.authSession.findUniqueOrThrow({
      where: { id: refreshClaims.sessionId },
    });
    expect(session.refreshTokenHash).not.toBe(refreshToken);
    await expect(argon2.verify(session.refreshTokenHash, refreshToken)).resolves.toBe(true);
  });

  it('accepts a valid access token and rejects missing, invalid, and expired access tokens', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid')
      .expect(401);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(responseBody<LoginBody['user']>(me)).toMatchObject({ id: userId, email });
    expect(responseBody<Record<string, unknown>>(me)).not.toHaveProperty('passwordHash');

    const claims = jwtService.decode<AccessTokenPayload>(accessToken);
    const expiredToken = await jwtService.signAsync(
      {
        sub: claims.sub,
        sessionId: claims.sessionId,
        email: claims.email,
        tokenType: 'access',
      },
      {
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: -1,
      },
    );
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('gets and updates only permitted profile properties', async () => {
    const current = await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(responseBody<LoginBody['user']>(current).profile.firstName).toBe('Ana');

    const updated = await request(app.getHttpServer())
      .patch('/api/v1/users/me/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ phone: '999888777', department: 'Lima', preferredCurrency: 'usd' })
      .expect(200);
    expect(responseBody<{ profile: Record<string, unknown> }>(updated).profile).toMatchObject({
      phone: '999888777',
      department: 'Lima',
      preferredCurrency: 'USD',
    });

    await request(app.getHttpServer())
      .patch('/api/v1/users/me/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'changed@example.com' })
      .expect(400);
  });

  it('rotates refresh tokens and rejects the previously used token', async () => {
    const previousRefreshToken = refreshToken;
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: previousRefreshToken })
      .expect(200);
    const body = responseBody<Omit<LoginBody, 'user'>>(response);

    expect(body.accessToken).not.toBe(accessToken);
    expect(body.refreshToken).not.toBe(previousRefreshToken);
    accessToken = body.accessToken;
    refreshToken = body.refreshToken;

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: previousRefreshToken })
      .expect(401);
  });

  it('rejects refresh for revoked and expired sessions', async () => {
    const revokedLogin = responseBody<LoginBody>(
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200),
    );
    const revokedClaims = jwtService.decode<RefreshTokenPayload>(revokedLogin.refreshToken);
    await prisma.authSession.update({
      where: { id: revokedClaims.sessionId },
      data: { revokedAt: new Date() },
    });
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: revokedLogin.refreshToken })
      .expect(401);

    const expiredLogin = responseBody<LoginBody>(
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200),
    );
    const expiredClaims = jwtService.decode<RefreshTokenPayload>(expiredLogin.refreshToken);
    await prisma.authSession.update({
      where: { id: expiredClaims.sessionId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: expiredLogin.refreshToken })
      .expect(401);
  });

  it('revokes the current session on logout and rejects subsequent refresh and access', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });
});
