import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { WorkspaceMember } from '../../generated/prisma/client';
import type { WorkspaceContextRequest } from '../types/workspace-context';

export const CurrentWorkspaceMember = createParamDecorator(
  (_data: unknown, context: ExecutionContext): WorkspaceMember =>
    context.switchToHttp().getRequest<WorkspaceContextRequest>().workspaceMember,
);
