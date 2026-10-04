'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, ErrorMessage, Field, Input } from '@/components/ui';
import { authApi } from '@/lib/api/auth';
import { safeRedirectPath } from '@/lib/navigation';
import { useAuth } from '@/providers/app-providers';

const loginSchema = z.object({
  email: z.email('Ingresa un email válido.'),
  password: z.string().min(1, 'Ingresa tu contraseña.'),
});
const registerSchema = loginSchema
  .extend({
    firstName: z.string().min(1, 'Ingresa tu nombre.'),
    paternalLastName: z.string().min(1, 'Ingresa tu apellido.'),
    password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden.',
  });
type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function AuthForm({
  mode,
  redirectTo = '/dashboard',
}: {
  mode: 'login' | 'register';
  redirectTo?: string | undefined;
}) {
  const router = useRouter();
  const { setSession } = useAuth();
  const destination = safeRedirectPath(redirectTo);
  const [error, setError] = useState<unknown>();
  const login = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const register = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });
  const submitLogin = login.handleSubmit(async (values) => {
    setError(undefined);
    try {
      const session = await authApi.login(values);
      setSession(session);
      router.replace(destination);
    } catch (e) {
      setError(e);
    }
  });
  const submitRegister = register.handleSubmit(async ({ confirmPassword: _, ...values }) => {
    setError(undefined);
    try {
      await authApi.register(values);
      const session = await authApi.login({ email: values.email, password: values.password });
      setSession(session);
      router.replace(destination);
    } catch (e) {
      setError(e);
    }
  });
  const submitting =
    mode === 'login' ? login.formState.isSubmitting : register.formState.isSubmitting;
  const emailError =
    mode === 'login'
      ? login.formState.errors.email?.message
      : register.formState.errors.email?.message;
  const passwordError =
    mode === 'login'
      ? login.formState.errors.password?.message
      : register.formState.errors.password?.message;
  return (
    <div className="auth-page">
      <aside className="auth-context">
        <div className="brand brand--auth">
          <span className="brand-mark">F</span>
          <span>Finance</span>
        </div>
        <div>
          <p className="eyebrow">FINANZAS EN ORDEN</p>
          <h1>Una vista clara de tu dinero y tu negocio.</h1>
          <p>
            Movimientos, presupuestos y reportes en un espacio sobrio, pensado para el trabajo
            diario.
          </p>
        </div>
        <span className="auth-security">
          <ShieldCheck size={18} /> Sesiones protegidas y datos aislados por espacio
        </span>
      </aside>
      <main className="auth-main">
        <section className="auth-card">
          <header>
            <p className="eyebrow">{mode === 'login' ? 'BIENVENIDO' : 'CREA TU CUENTA'}</p>
            <h2>{mode === 'login' ? 'Inicia sesión' : 'Comienza a organizar tus finanzas'}</h2>
            <p>
              {mode === 'login'
                ? 'Accede a tus espacios personales y de negocio.'
                : 'Después podrás crear tu primer espacio financiero.'}
            </p>
          </header>
          {error ? <ErrorMessage error={error} /> : null}
          <form onSubmit={mode === 'login' ? submitLogin : submitRegister} className="form-grid">
            {mode === 'register' && (
              <div className="form-row">
                <Field label="Nombre">
                  <Input autoComplete="given-name" {...register.register('firstName')} />
                  <small>{register.formState.errors.firstName?.message}</small>
                </Field>
                <Field label="Apellido paterno">
                  <Input autoComplete="family-name" {...register.register('paternalLastName')} />
                  <small>{register.formState.errors.paternalLastName?.message}</small>
                </Field>
              </div>
            )}
            <Field label="Email">
              <Input
                type="email"
                autoComplete="email"
                placeholder="nombre@correo.com"
                {...(mode === 'login' ? login.register('email') : register.register('email'))}
              />
              <small>{emailError}</small>
            </Field>
            <Field label="Contraseña">
              <Input
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                {...(mode === 'login' ? login.register('password') : register.register('password'))}
              />
              <small>{passwordError}</small>
            </Field>
            {mode === 'register' && (
              <Field label="Confirmar contraseña">
                <Input
                  type="password"
                  autoComplete="new-password"
                  {...register.register('confirmPassword')}
                />
                <small>{register.formState.errors.confirmPassword?.message}</small>
              </Field>
            )}
            {mode === 'register' && (
              <p className="form-hint">Mínimo 8 caracteres, con mayúscula, minúscula y número.</p>
            )}
            <Button disabled={submitting}>
              {submitting ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}{' '}
              <ArrowRight size={16} />
            </Button>
          </form>
          <footer>
            {mode === 'login' ? '¿Primera vez aquí?' : '¿Ya tienes una cuenta?'}{' '}
            <Link
              href={`${mode === 'login' ? '/register' : '/login'}?next=${encodeURIComponent(destination)}`}
            >
              {mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión'}
            </Link>
          </footer>
        </section>
      </main>
    </div>
  );
}
