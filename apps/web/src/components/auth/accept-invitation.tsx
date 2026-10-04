'use client';

import { ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, ErrorMessage, Field, Input } from '@/components/ui';
import { workspacesApi } from '@/lib/api/workspaces';
import { useAuth, useWorkspace } from '@/providers/app-providers';

export function AcceptInvitation({ initialToken }: { initialToken: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { reload, select } = useWorkspace();
  const [token, setToken] = useState(initialToken);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const returnPath = `/accept-invitation${token ? `?token=${encodeURIComponent(token)}` : ''}`;

  const accept = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      const membership = await workspacesApi.acceptInvitation(token.trim());
      await reload();
      select(membership.workspaceId);
      router.replace('/dashboard');
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <span className="brand-mark">F</span>
        <p>Preparando tu invitación…</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <aside className="auth-context">
        <div className="brand brand--auth">
          <span className="brand-mark">F</span>
          <span>Finance</span>
        </div>
        <div>
          <p className="eyebrow">INVITACIÓN A UN ESPACIO</p>
          <h1>Colabora con las finanzas del negocio.</h1>
          <p>Usa el token recibido para unirte con el rol que te asignó el propietario.</p>
        </div>
        <span className="auth-security">
          <ShieldCheck size={18} /> El token solo puede utilizarse una vez
        </span>
      </aside>
      <main className="auth-main">
        <section className="auth-card">
          <header>
            <p className="eyebrow">ACEPTAR INVITACIÓN</p>
            <h2>Únete al espacio</h2>
            <p>
              {user
                ? `La invitación se validará para ${user.email}.`
                : 'Inicia sesión o crea la cuenta asociada al correo que recibió la invitación.'}
            </p>
          </header>
          {user ? (
            <form className="form-grid" onSubmit={accept}>
              {initialToken ? (
                <p className="notice">El enlace de invitación está listo para validarse.</p>
              ) : (
                <Field label="Token de invitación">
                  <Input
                    required
                    minLength={20}
                    autoComplete="off"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                  />
                </Field>
              )}
              {error ? <ErrorMessage error={error} /> : null}
              <Button disabled={busy || token.trim().length < 20}>
                {busy ? 'Aceptando…' : 'Aceptar invitación'} <ArrowRight size={16} />
              </Button>
            </form>
          ) : (
            <div className="form-grid">
              <Link
                className="button button--primary auth-action-link"
                href={`/login?next=${encodeURIComponent(returnPath)}`}
              >
                Iniciar sesión <ArrowRight size={16} />
              </Link>
              <Link
                className="button button--secondary auth-action-link"
                href={`/register?next=${encodeURIComponent(returnPath)}`}
              >
                Crear cuenta
              </Link>
            </div>
          )}
          <footer>
            <Link href="/dashboard">Volver al dashboard</Link>
          </footer>
        </section>
      </main>
    </div>
  );
}
