import { api } from './client';
import type {
  BusinessProfile,
  Invitation,
  Member,
  MyInvitation,
  Workspace,
  WorkspaceMembership,
  WorkspaceRole,
  WorkspaceType,
} from '@/types/api';
export const workspacesApi = {
  list: () => api<WorkspaceMembership[]>('/workspaces'),
  create: (body: { name: string; type: WorkspaceType; description?: string }) =>
    api<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Workspace>) =>
    api<Workspace>(`/workspaces/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  remove: (id: string) => api<void>(`/workspaces/${id}`, { method: 'DELETE' }),
  business: (id: string) => api<BusinessProfile>(`/workspaces/${id}/business-profile`),
  saveBusiness: (id: string, body: BusinessProfile) =>
    api<BusinessProfile>(`/workspaces/${id}/business-profile`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  members: (id: string) => api<Member[]>(`/workspaces/${id}/members`),
  updateMember: (id: string, memberId: string, body: { role?: WorkspaceRole; status?: string }) =>
    api<Member>(`/workspaces/${id}/members/${memberId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  removeMember: (id: string, memberId: string) =>
    api<void>(`/workspaces/${id}/members/${memberId}`, { method: 'DELETE' }),
  invitations: (id: string) => api<Invitation[]>(`/workspaces/${id}/invitations`),
  invite: (id: string, body: { email: string; role: Exclude<WorkspaceRole, 'OWNER'> }) =>
    api<Invitation>(`/workspaces/${id}/invitations`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  cancelInvitation: (id: string, invitationId: string) =>
    api<void>(`/workspaces/${id}/invitations/${invitationId}`, { method: 'DELETE' }),
  acceptInvitation: (token: string) =>
    api<{ workspaceId: string }>('/workspace-invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  getMyInvitations: () => api<MyInvitation[]>('/workspace-invitations/me'),
  acceptMyInvitation: (invitationId: string) =>
    api<WorkspaceMembership>(`/workspace-invitations/${invitationId}/accept`, {
      method: 'POST',
    }),
  rejectMyInvitation: (invitationId: string) =>
    api<MyInvitation>(`/workspace-invitations/${invitationId}/reject`, {
      method: 'POST',
    }),
};
