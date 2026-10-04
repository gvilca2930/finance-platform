import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import {
  buildInvitationLink,
  invalidateInvitationQueries,
  myInvitationsQueryKey,
} from './invitations';

describe('invitation helpers', () => {
  it('builds the one-time development link and encodes the token', () => {
    expect(buildInvitationLink('http://localhost:3000', 'sensitive/token+value')).toBe(
      'http://localhost:3000/accept-invitation?token=sensitive%2Ftoken%2Bvalue',
    );
  });

  it('invalidates received invitations, workspaces, and members after acceptance', async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue();
    await invalidateInvitationQueries(client, true);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: myInvitationsQueryKey });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['workspaces'] });
    expect(invalidate).toHaveBeenCalledWith({ predicate: expect.any(Function) });
  });

  it('only invalidates received invitations after rejection', async () => {
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue();
    await invalidateInvitationQueries(client, false);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: myInvitationsQueryKey });
  });
});
