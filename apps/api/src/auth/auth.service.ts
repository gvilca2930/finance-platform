import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { Environment } from '../config/environment';
import { PrismaService } from '../prisma/prisma.service';
import { presentUser, type SafeUser } from '../users/user.presenter';
import type { LoginDto } from './dto/login.dto';
import type { RefreshDto } from './dto/refresh.dto';
import type { RegisterDto } from './dto/register.dto';
import type { AccessTokenPayload, AuthenticatedUser, RefreshTokenPayload } from './types/auth-user';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid credentials';
const INVALID_TOKEN_MESSAGE = 'Invalid or expired token';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresAt: Date;
}

export interface LoginResponse extends Omit<TokenPair, 'refreshExpiresAt'> {
  user: SafeUser;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Environment, true>,
  ) {}

  async register(dto: RegisterDto): Promise<SafeUser> {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const { password: _password, email: _email, ...profile } = dto;

    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const createdUser = await transaction.user.create({
          data: {
            email,
            passwordHash,
            status: 'ACTIVE',
          },
        });

        const createdProfile = await transaction.userProfile.create({
          data: {
            ...profile,
            userId: createdUser.id,
            countryCode: profile.countryCode ?? 'PE',
            preferredCurrency: profile.preferredCurrency ?? 'PEN',
            timezone: profile.timezone ?? 'America/Lima',
            language: profile.language ?? 'es',
          },
        });

        return { ...createdUser, profile: createdProfile };
      });

      return presentUser(user);
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    let passwordMatches = false;
    try {
      passwordMatches = await argon2.verify(user.passwordHash, dto.password);
    } catch {
      passwordMatches = false;
    }

    if (!passwordMatches) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const sessionId = randomUUID();
    const tokens = await this.issueTokenPair(user.id, user.email, sessionId);
    const refreshTokenHash = await argon2.hash(tokens.refreshToken, { type: argon2.argon2id });
    const now = new Date();

    const updatedUser = await this.prisma.$transaction(async (transaction) => {
      await transaction.authSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          refreshTokenHash,
          expiresAt: tokens.refreshExpiresAt,
        },
      });

      return transaction.user.update({
        where: { id: user.id },
        data: { lastLoginAt: now },
        include: { profile: true },
      });
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: presentUser(updatedUser),
    };
  }

  async refresh(dto: RefreshDto): Promise<Omit<LoginResponse, 'user'>> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(dto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    if (payload.tokenType !== 'refresh' || !payload.sub || !payload.sessionId) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    const now = new Date();
    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== 'ACTIVE' ||
      session.user.deletedAt
    ) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    let tokenMatches = false;
    try {
      tokenMatches = await argon2.verify(session.refreshTokenHash, dto.refreshToken);
    } catch {
      tokenMatches = false;
    }

    if (!tokenMatches) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    const tokens = await this.issueTokenPair(session.user.id, session.user.email, session.id);
    const newRefreshTokenHash = await argon2.hash(tokens.refreshToken, {
      type: argon2.argon2id,
    });
    const rotated = await this.prisma.authSession.updateMany({
      where: {
        id: session.id,
        userId: session.userId,
        refreshTokenHash: session.refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: tokens.refreshExpiresAt,
        lastUsedAt: now,
      },
    });

    if (rotated.count !== 1) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  async logout(currentUser: AuthenticatedUser): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: {
        id: currentUser.sessionId,
        userId: currentUser.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    return presentUser(user);
  }

  private async issueTokenPair(
    userId: string,
    email: string,
    sessionId: string,
  ): Promise<TokenPair> {
    type ExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;
    const accessExpiresIn = this.configService.get('JWT_ACCESS_EXPIRES_IN', {
      infer: true,
    }) as ExpiresIn;
    const refreshExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', {
      infer: true,
    }) as ExpiresIn;

    const accessPayload: AccessTokenPayload = {
      sub: userId,
      sessionId,
      email,
      tokenType: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      sessionId,
      tokenType: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: accessExpiresIn,
        jwtid: randomUUID(),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: refreshExpiresIn,
        jwtid: randomUUID(),
      }),
    ]);

    const accessClaims = this.jwtService.decode<{ exp: number; iat: number }>(accessToken);
    const refreshClaims = this.jwtService.decode<{ exp: number }>(refreshToken);

    if (!accessClaims?.exp || !accessClaims.iat || !refreshClaims?.exp) {
      throw new Error('Unable to determine token expiration');
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: accessClaims.exp - accessClaims.iat,
      refreshExpiresAt: new Date(refreshClaims.exp * 1000),
    };
  }
}
