import type { WorkspaceRole, WorkspaceType } from '@/types/api';
export const canWriteFinance = (role?: WorkspaceRole) => role !== 'VIEWER' && role !== undefined;
export const canManageOperations = (role?: WorkspaceRole) => role === 'OWNER' || role === 'ADMIN';
export const canManageWorkspace = (role?: WorkspaceRole) => role === 'OWNER';
export const canManageMembers = (role?: WorkspaceRole) => role === 'OWNER' || role === 'ADMIN';

export function canAccessWorkspaceRoute(
  pathname: string,
  membership: { role: WorkspaceRole; workspace: { type: WorkspaceType } },
) {
  if (pathname === '/settings/workspace') return canManageWorkspace(membership.role);
  if (pathname === '/members' || pathname === '/invitations' || pathname === '/settings/business') {
    return membership.workspace.type === 'BUSINESS' && canManageMembers(membership.role);
  }
  return true;
}
