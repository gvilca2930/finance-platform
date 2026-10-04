'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import {
  Badge,
  ConfirmDialog,
  ErrorMessage,
  PageHeader,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import { workspacesApi } from '@/lib/api/workspaces';
import { formatDate } from '@/lib/dates';
import { labels } from '@/lib/labels';
import { canManageMembers } from '@/lib/permissions';
import { useWorkspace } from '@/providers/app-providers';
import type { Member, WorkspaceRole } from '@/types/api';
export default function MembersPage() {
  const { current } = useWorkspace();
  const id = current?.workspaceId ?? '';
  const qc = useQueryClient();
  const { show, toast } = useToast();
  const manage = canManageMembers(current?.role);
  const [remove, setRemove] = useState<Member | null>(null);
  const query = useQuery({
    queryKey: ['members', id],
    queryFn: () => workspacesApi.members(id),
    enabled: Boolean(id),
  });
  const update = useMutation({
    mutationFn: ({ member, role }: { member: Member; role: WorkspaceRole }) =>
      workspacesApi.updateMember(id, member.id, { role }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['members', id] });
      show('Rol actualizado.');
    },
  });
  const destroy = useMutation({
    mutationFn: () => workspacesApi.removeMember(id, remove!.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['members', id] });
      setRemove(null);
      show('Miembro removido.');
    },
  });
  return (
    <>
      <PageHeader
        title="Miembros"
        description="Usuarios que colaboran en este espacio de negocio."
      />
      {query.isLoading ? (
        <Skeleton lines={6} />
      ) : (
        <section className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Ingreso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {query.data?.map((member) => (
                <tr key={member.id}>
                  <td>
                    <strong>
                      {member.user.profile.firstName} {member.user.profile.paternalLastName}
                    </strong>
                  </td>
                  <td>{member.user.email}</td>
                  <td>
                    {manage && !(current?.role === 'ADMIN' && member.role === 'OWNER') ? (
                      <Select
                        aria-label={`Rol de ${member.user.email}`}
                        value={member.role}
                        onChange={(e) =>
                          update.mutate({ member, role: e.target.value as WorkspaceRole })
                        }
                      >
                        <option value="OWNER" disabled={current?.role !== 'OWNER'}>
                          Propietario
                        </option>
                        <option value="ADMIN">Administrador</option>
                        <option value="STAFF">Colaborador</option>
                        <option value="VIEWER">Solo lectura</option>
                      </Select>
                    ) : (
                      labels.roles[member.role]
                    )}
                  </td>
                  <td>
                    <Badge tone={member.status === 'ACTIVE' ? 'success' : 'warning'}>
                      {member.status === 'ACTIVE' ? 'Activo' : member.status}
                    </Badge>
                  </td>
                  <td>{formatDate(member.joinedAt)}</td>
                  <td>
                    {manage && member.role !== 'OWNER' && (
                      <details className="row-menu">
                        <summary>
                          <MoreHorizontal />
                        </summary>
                        <div>
                          <button className="danger-text" onClick={() => setRemove(member)}>
                            Remover
                          </button>
                        </div>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {update.error && <ErrorMessage error={update.error} />}
        </section>
      )}
      <ConfirmDialog
        open={Boolean(remove)}
        title="Remover miembro"
        description="El usuario perderá acceso a este espacio y sus cuentas."
        onClose={() => setRemove(null)}
        onConfirm={() => destroy.mutate()}
        busy={destroy.isPending}
      />
      {toast}
    </>
  );
}
