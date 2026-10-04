export interface AuthenticatedUser {
  userId: string;
  sessionId: string;
  email: string;
}

export interface AccessTokenPayload {
  sub: string;
  sessionId: string;
  email: string;
  tokenType: 'access';
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  tokenType: 'refresh';
  iat?: number;
  exp?: number;
}
