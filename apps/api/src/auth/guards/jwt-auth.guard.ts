import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Environment } from '../../config/environment';
import { PrismaService } from '../../prisma/prisma.service';
import type { AccessTokenPayload } from '../types/auth-user';
import type { RequestWithUser } from '../types/request-with-user';

const INVALID_TOKEN_MESSAGE = 'Invalid or expired token';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorization = request.headers.authorization;
    const [scheme, token, extra] = authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token || extra) {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      });

      if (payload.tokenType !== 'access' || !payload.sub || !payload.sessionId || !payload.email) {
        throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
      }

      const session = await this.prisma.authSession.findFirst({
        where: {
          id: payload.sessionId,
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: { status: 'ACTIVE', deletedAt: null },
        },
        select: { id: true },
      });

      if (!session) {
        throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
      }

      request.user = {
        userId: payload.sub,
        sessionId: payload.sessionId,
        email: payload.email,
      };
      return true;
    } catch {
      throw new UnauthorizedException(INVALID_TOKEN_MESSAGE);
    }
  }
}
