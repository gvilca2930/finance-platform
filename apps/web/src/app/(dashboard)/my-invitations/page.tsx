'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorMessage,
  PageHeader,
  Skeleton,
  useToast,
} from '@/components/ui';
import { workspacesApi } from '@/lib/api/workspaces';
import { formatDate } from '@/lib/dates';
import { invalidateInvitationQueries, myInvitationsQueryKey } from '@/lib/invitations';
import { labels } from '@/lib/labels';
import { useWorkspace } from '@/providers/app-providers';
import type { MyInvitation } from '@/types/api';

export default function MyInvitationsPage() {
  const queryClient = useQueryClient();
  const { reload } = useWorkspace();
  const { show, toast } = useToast();
  const [rejecting, setRejecting] = useState<MyInvitation | null>(null);
  const query = useQuery({
    queryKey: myInvitationsQueryKey,
    queryFn: workspacesApi.getMyInvitations,
  });
  const accept = useMutation({
    mutationFn: (invitation: MyInvitation) =>
      workspacesApi.acceptMyInvitation(invitation.id).then(() => invitation),
    onSuccess: async (invitation) => {
      await invalidateInvitationQueries(queryClient, true);
      await reload();
      show(`InvitaciÃ³n aceptada. Ya puedes acceder a ${invitation.workspace.name}.`);
    },
  });
  const reject = useMutation({
    mutationFn: (invitation: MyInvitation) =>
      workspacesApi.rejectMyInvitation(invitation.id).then(() => invitation),
    onSuccess: async () => {
      await invalidateInvitationQueries(queryClient, false);
      setRejecting(null);
      show('InvitaciÃ³n rechazada.');
    },
  });

  return (
    <>
      <PageHeader
        title="Mis invitaciones"
        description="Espacios financieros a los que te han invitado."
      />
      {query.isLoading ? (
        <Skeleton lines={4} />
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : !query.data?.length ? (
        <EmptyState
          title="No tienes invitaciones pendientes."
          description="Las invitaciones a espacios compartidos aparecerÃ¡n aquÃ­."
        />
      ) : (
        <section className="invitation-list" aria-label="Invitaciones pendientes">
          {query.data.map((invitation) => (
            <article className="invitation-row" key={invitation.id}>
              <div className="invitation-main">
                <strong>{invitation.workspace.name}</strong>
                <span>{invitation.workspace.type === 'BUSINESS' ? 'Negocio' : 'Personal'}</span>
              </div>
              <div className="invitation-detail">
                <small>Rol</small>
                <span>{labels.roles[invitation.role]}</span>
              </div>
              <div className="invitation-detail">
                <small>Invitado por</small>
                <span>{invitation.invitedBy?.name ?? 'No disponible'}</span>
              </div>
              <div className="invitation-detail">
                <small>Vence</small>
                <span>{formatDate(invitation.expiresAt)}</span>
              </div>
              <Badge tone="info">Pendiente</Badge>
              <div className="invitation-actions">
                <Button
                  disabled={accept.isPending || reject.isPending}
                  onClick={() => accept.mutate(invitation)}
                >
                  Aceptar
                </Button>
                <Button
                  variant="secondary"
                  disabled={accept.isPending || reject.isPending}
                  onClick={() => setRejecting(invitation)}
                >
                  Rechazar
                </Button>
              </div>
            </article>
          ))}
        </section>
      )}
      {accept.error ? <ErrorMessage error={accept.error} /> : null}
      {reject.error ? <ErrorMessage error={reject.error} /> : null}
      <ConfirmDialog
        open={Boolean(rejecting)}
        title="Rechazar invitaciÃ³n"
        description="Esta invitaciÃ³n dejarÃ¡ de estar disponible."
        confirmLabel="Rechazar"
        busyLabel="Rechazandoâ€¦"
        busy={reject.isPending}
        onClose={() => setRejecting(null)}
        onConfirm={() => rejecting && reject.mutate(rejecting)}
      />
      {toast}
    </>
  );
}
