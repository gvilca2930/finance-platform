import type { QueryClient } from '@tanstack/react-query';

export const myInvitationsQueryKey = ['my-invitations'] as const;

export function buildInvitationLink(origin: string, token: string): string {
  return `${origin}/accept-invitation?token=${encodeURIComponent(token)}`;
}

export async function invalidateInvitationQueries(
  queryClient: QueryClient,
  accepted: boolean,
): Promise<void> {
  const invalidations = [queryClient.invalidateQueries({ queryKey: myInvitationsQueryKey })];
  if (accepted) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['workspaces'] }),
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey.includes('members'),
      }),
    );
  }
  await Promise.all(invalidations);
}
