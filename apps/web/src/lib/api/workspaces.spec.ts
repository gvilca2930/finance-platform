import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';
import { workspacesApi } from './workspaces';

vi.mock('./client', () => ({ api: vi.fn() }));

describe('workspace invitation API', () => {
  beforeEach(() => vi.mocked(api).mockReset());

  it('gets invitations for the authenticated user without sending an email', async () => {
    vi.mocked(api).mockResolvedValueOnce([]);
    await workspacesApi.getMyInvitations();
    expect(api).toHaveBeenCalledWith('/workspace-invitations/me');
  });

  it('accepts an internal invitation by id', async () => {
    vi.mocked(api).mockResolvedValueOnce({});
    await workspacesApi.acceptMyInvitation('invitation-1');
    expect(api).toHaveBeenCalledWith('/workspace-invitations/invitation-1/accept', {
      method: 'POST',
    });
  });

  it('rejects an internal invitation by id', async () => {
    vi.mocked(api).mockResolvedValueOnce({});
    await workspacesApi.rejectMyInvitation('invitation-1');
    expect(api).toHaveBeenCalledWith('/workspace-invitations/invitation-1/reject', {
      method: 'POST',
    });
  });
});
