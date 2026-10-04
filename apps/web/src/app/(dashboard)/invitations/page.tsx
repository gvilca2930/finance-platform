'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus } from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorMessage,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import { workspacesApi } from '@/lib/api/workspaces';
import { formatDate } from '@/lib/dates';
import { buildInvitationLink } from '@/lib/invitations';
import { labels } from '@/lib/labels';
import { useWorkspace } from '@/providers/app-providers';
import type { Invitation, WorkspaceRole } from '@/types/api';
export default function InvitationsPage() {
  const { current } = useWorkspace();
  const id = current?.workspaceId ?? '';
  const qc = useQueryClient();
  const { show, toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Exclude<WorkspaceRole, 'OWNER'>>('STAFF');
  const [cancel, setCancel] = useState<Invitation | null>(null);
  const [created, setCreated] = useState<Invitation | null>(null);
  const query = useQuery({
    queryKey: ['invitations', id],
    queryFn: () => workspacesApi.invitations(id),
    enabled: Boolean(id),
  });
  const invite = useMutation({
    mutationFn: () => workspacesApi.invite(id, { email, role }),
    onSuccess: async (result) => {
      await qc.invalidateQueries({ queryKey: ['invitations', id] });
      setCreated(result.token ? result : null);
      show('Invitación creada.');
    },
  });
  const destroy = useMutation({
    mutationFn: () => workspacesApi.cancelInvitation(id, cancel!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['invitations', id] });
      setCancel(null);
      show('Invitación cancelada.');
    },
  });
  const tone = (status: string) =>
    status === 'ACCEPTED'
      ? 'success'
      : status === 'PENDING'
        ? 'info'
        : status === 'EXPIRED'
          ? 'warning'
          : 'neutral';
  return (
    <>
      <PageHeader
        title="Invitaciones"
        description="Invita colaboradores al espacio de negocio."
        action={
          <Button
            onClick={() => {
              setCreated(null);
              setOpen(true);
            }}
          >
            <Plus size={16} /> Nueva invitación
          </Button>
        }
      />
      <div className="notice">
        <span>
          <strong>El envío automático por correo aún no está disponible.</strong> Comparte el enlace
          directamente con la persona invitada.
        </span>
      </div>
      {query.isLoading ? (
        <Skeleton lines={6} />
      ) : !query.data?.length ? (
        <EmptyState
          title="Sin invitaciones"
          description="Invita a un administrador, colaborador o usuario de solo lectura."
        />
      ) : (
        <section className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Expira</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.email}</strong>
                  </td>
                  <td>{labels.roles[item.role]}</td>
                  <td>
                    <Badge tone={tone(item.status)}>{item.status}</Badge>
                  </td>
                  <td>{formatDate(item.expiresAt)}</td>
                  <td>
                    {item.status === 'PENDING' && (
                      <Button variant="ghost" onClick={() => setCancel(item)}>
                        Cancelar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <Modal
        open={open}
        title={created ? 'Invitación creada' : 'Nueva invitación'}
        {...(created ? { description: 'El enlace solo está disponible en este momento.' } : {})}
        onClose={() => {
          setOpen(false);
          setCreated(null);
        }}
      >
        {created?.token ? (
          <div className="token-result">
            <dl className="invitation-summary">
              <div>
                <dt>Usuario</dt>
                <dd>{created.email}</dd>
              </div>
              <div>
                <dt>Rol</dt>
                <dd>{labels.roles[created.role]}</dd>
              </div>
            </dl>
            <Field label="Enlace de invitación">
              <Input
                readOnly
                value={buildInvitationLink(window.location.origin, created.token)}
                onFocus={(event) => event.currentTarget.select()}
              />
            </Field>
            <Button
              variant="secondary"
              onClick={() =>
                void navigator.clipboard.writeText(
                  buildInvitationLink(window.location.origin, created.token!),
                )
              }
            >
              <Copy size={16} /> Copiar enlace
            </Button>
            <p className="form-hint">
              Si la persona ya tiene una cuenta en Finance Platform, también encontrará esta
              invitación en &quot;Mis invitaciones&quot;. El envío automático por correo se
              incorporará posteriormente.
            </p>
            <Button
              onClick={() => {
                setOpen(false);
                setCreated(null);
              }}
            >
              Listo
            </Button>
          </div>
        ) : (
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              invite.mutate();
            }}
          >
            <Field label="Email">
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
              />
            </Field>
            <Field label="Rol">
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as Exclude<WorkspaceRole, 'OWNER'>)}
              >
                <option value="ADMIN">Administrador</option>
                <option value="STAFF">Colaborador</option>
                <option value="VIEWER">Solo lectura</option>
              </Select>
            </Field>
            {invite.error && <ErrorMessage error={invite.error} />}
            <div className="form-actions">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button disabled={invite.isPending}>Crear invitación</Button>
            </div>
          </form>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(cancel)}
        title="Cancelar invitación"
        description="El token dejará de ser válido inmediatamente."
        onClose={() => setCancel(null)}
        onConfirm={() => destroy.mutate()}
        busy={destroy.isPending}
      />
      {toast}
    </>
  );
}
