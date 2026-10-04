'use client';
import {
  BarChart3,
  BookOpen,
  Building2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Repeat2,
  Settings,
  Tags,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, Field, Input, Modal, Select } from '@/components/ui';
import { workspacesApi } from '@/lib/api/workspaces';
import { myInvitationsQueryKey } from '@/lib/invitations';
import { labels } from '@/lib/labels';
import { canAccessWorkspaceRoute, canManageMembers, canManageWorkspace } from '@/lib/permissions';
import { useAuth, useWorkspace } from '@/providers/app-providers';
import type { WorkspaceType } from '@/types/api';

const finance = [
  ['/transactions', 'Movimientos', CreditCard],
  ['/accounts', 'Cuentas', WalletCards],
  ['/categories', 'Categorías', Tags],
  ['/transfers', 'Transferencias', Repeat2],
  ['/budgets', 'Presupuestos', CircleDollarSign],
  ['/recurring', 'Recurrentes', RefreshCw],
] as const;
function NavItem({
  href,
  label,
  Icon,
  close,
}: {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  close: () => void;
}) {
  const pathname = usePathname();
  return (
    <Link
      href={href}
      className={`nav-item ${pathname === href ? 'is-active' : ''}`}
      onClick={close}
    >
      <Icon size={17} />
      <span>{label}</span>
    </Link>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const { memberships, current, loading: workspaceLoading, select, reload } = useWorkspace();
  const [mobile, setMobile] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [type, setType] = useState<WorkspaceType>('PERSONAL');
  const [name, setName] = useState('Mis finanzas');
  const [busy, setBusy] = useState(false);
  const myInvitations = useQuery({
    queryKey: myInvitationsQueryKey,
    queryFn: workspacesApi.getMyInvitations,
    enabled: Boolean(user),
  });
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);
  const routeAllowed = !current || canAccessWorkspaceRoute(pathname, current);
  useEffect(() => {
    if (!workspaceLoading && current && !routeAllowed) router.replace('/dashboard');
  }, [current, routeAllowed, router, workspaceLoading]);
  if (loading || !user)
    return (
      <div className="app-loading">
        <span className="brand-mark">F</span>
        <p>Preparando tu espacio…</p>
      </div>
    );
  const close = () => setMobile(false);
  const createWorkspace = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const created = await workspacesApi.create({ name, type });
      await reload();
      select(created.id);
      setCreateOpen(false);
      router.push('/dashboard');
    } finally {
      setBusy(false);
    }
  };
  const businessAdmin = current?.workspace.type === 'BUSINESS' && canManageMembers(current.role);
  const workspaceOwner = canManageWorkspace(current?.role);
  const workspaceIndependent = pathname === '/my-invitations' || pathname === '/profile';
  return (
    <div className="app-frame">
      <button className="mobile-menu" aria-label="Abrir navegación" onClick={() => setMobile(true)}>
        <Menu />
      </button>
      {mobile && (
        <button className="sidebar-scrim" aria-label="Cerrar navegación" onClick={close} />
      )}
      <aside className={`sidebar ${mobile ? 'is-open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">F</span>
          <span>Finance</span>
          <button className="sidebar-close" onClick={close} aria-label="Cerrar">
            <X />
          </button>
        </div>
        <button className="workspace-switcher" onClick={() => setCreateOpen(true)}>
          <span>
            <small>Espacio actual</small>
            <strong>{current?.workspace.name ?? 'Crear espacio'}</strong>
          </span>
          <ChevronDown size={16} />
        </button>
        {memberships.length > 1 && (
          <div className="workspace-list">
            {memberships.map((item) => (
              <button
                key={item.id}
                className={item.id === current?.id ? 'selected' : ''}
                onClick={() => select(item.workspaceId)}
              >
                {item.workspace.name}
              </button>
            ))}
          </div>
        )}
        <nav>
          <NavItem href="/dashboard" label="Dashboard" Icon={LayoutDashboard} close={close} />
          <p className="nav-label">Finanzas</p>
          {finance.map(([href, label, Icon]) => (
            <NavItem key={href} href={href} label={label} Icon={Icon} close={close} />
          ))}
          <p className="nav-label">Análisis</p>
          <NavItem href="/reports" label="Reportes" Icon={BarChart3} close={close} />
          {(businessAdmin || workspaceOwner) && (
            <>
              <p className="nav-label">Administración</p>
              {businessAdmin && (
                <>
                  <NavItem href="/members" label="Miembros" Icon={Users} close={close} />
                  <NavItem href="/invitations" label="Invitaciones" Icon={BookOpen} close={close} />
                  <NavItem
                    href="/settings/business"
                    label="Negocio"
                    Icon={Building2}
                    close={close}
                  />
                </>
              )}
              {workspaceOwner && (
                <NavItem
                  href="/settings/workspace"
                  label="Configuración"
                  Icon={Settings}
                  close={close}
                />
              )}
            </>
          )}
        </nav>
        <div className="sidebar-user">
          <div className="sidebar-identity">
            <span className="avatar">{user.profile.firstName.slice(0, 1)}</span>
            <span>
              <strong>
                {user.profile.firstName} {user.profile.paternalLastName}
              </strong>
              <small>{current ? labels.roles[current.role] : 'Sin espacio'}</small>
            </span>
            <UserRound size={17} />
          </div>
          <Link className="sidebar-user-link" href="/profile" onClick={close}>
            Mi perfil
          </Link>
          <Link className="sidebar-user-link" href="/my-invitations" onClick={close}>
            <span>Mis invitaciones</span>
            {Boolean(myInvitations.data?.length) && (
              <span className="menu-count">{myInvitations.data?.length}</span>
            )}
          </Link>
          <button onClick={() => void logout()}>Cerrar sesión</button>
        </div>
      </aside>
      <main className="main-content">
        {workspaceIndependent || current || workspaceLoading ? (
          routeAllowed ? (
            children
          ) : (
            <div className="app-loading">Redirigiendo…</div>
          )
        ) : (
          <div className="empty">
            <h2>Configura tu primer espacio</h2>
            <p>Elige un espacio personal o de negocio para comenzar.</p>
            <Button onClick={() => setCreateOpen(true)}>Crear espacio</Button>
          </div>
        )}
      </main>
      <Modal
        open={
          createOpen || (!workspaceLoading && memberships.length === 0 && !workspaceIndependent)
        }
        title={memberships.length ? 'Espacios de trabajo' : 'Configura tu primer espacio'}
        description={
          memberships.length
            ? 'Selecciona un espacio existente o crea uno nuevo.'
            : 'Puedes comenzar con finanzas personales o con tu negocio.'
        }
        onClose={() => {
          if (memberships.length) setCreateOpen(false);
        }}
      >
        {memberships.length > 0 && (
          <div className="workspace-modal-list">
            {memberships.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  select(item.workspaceId);
                  setCreateOpen(false);
                }}
              >
                {item.workspace.name}
                <small>{item.workspace.type === 'PERSONAL' ? 'Personal' : 'Negocio'}</small>
              </button>
            ))}
          </div>
        )}
        <form onSubmit={createWorkspace} className="form-grid">
          <Field label="Tipo">
            <Select
              value={type}
              onChange={(e) => {
                const next = e.target.value as WorkspaceType;
                setType(next);
                setName(next === 'PERSONAL' ? 'Mis finanzas' : 'Mi negocio');
              }}
            >
              <option value="PERSONAL">Finanzas personales</option>
              <option value="BUSINESS">Negocio</option>
            </Select>
          </Field>
          <Field label="Nombre">
            <Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="form-actions">
            <Button disabled={busy}>{busy ? 'Creando…' : 'Crear espacio'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
