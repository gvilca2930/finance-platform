import { AuthForm } from '@/components/auth/auth-form';
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return <AuthForm mode="register" redirectTo={typeof next === 'string' ? next : undefined} />;
}
