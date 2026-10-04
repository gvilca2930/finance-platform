import { AcceptInvitation } from '@/components/auth/accept-invitation';

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return <AcceptInvitation initialToken={typeof token === 'string' ? token : ''} />;
}
