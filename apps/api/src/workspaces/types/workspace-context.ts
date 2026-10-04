import type { Workspace, WorkspaceMember } from '../../generated/prisma/client';

export interface WorkspaceContextRequest {
  workspace: Workspace;
  workspaceMember: WorkspaceMember;
}
