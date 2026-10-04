import type { Request } from 'express';
import type { AuthenticatedUser } from './auth-user';

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
}
