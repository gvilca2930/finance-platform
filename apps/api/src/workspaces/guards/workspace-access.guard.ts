import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { WorkspaceRole } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestWithUser } from '../../auth/types/request-with-user';
import { WORKSPACE_ROLES_KEY } from '../decorators/workspace-roles.decorator';
import type { WorkspaceContextRequest } from '../types/workspace-context';

@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser & WorkspaceContextRequest>();
    const rawWorkspaceId = request.params['workspaceId'];
    const workspaceId = Array.isArray(rawWorkspaceId) ? rawWorkspaceId[0] : rawWorkspaceId;
    if (!workspaceId) throw new NotFoundException('Workspace not found');

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: request.user.userId } },
      include: { workspace: true },
    });
    if (
      !membership ||
      membership.status !== 'ACTIVE' ||
      membership.workspace.deletedAt ||
      membership.workspace.status !== 'ACTIVE'
    ) {
      throw new NotFoundException('Workspace not found');
    }

    const roles = this.reflector.getAllAndOverride<WorkspaceRole[]>(WORKSPACE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles?.length && !roles.includes(membership.role)) {
      throw new ForbiddenException('Insufficient workspace permissions');
    }

    request.workspaceMember = membership;
    request.workspace = membership.workspace;
    return true;
  }
}
