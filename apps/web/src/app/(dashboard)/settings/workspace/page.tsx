'use client';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Button,
  ConfirmDialog,
  ErrorMessage,
  Field,
  Input,
  PageHeader,
  Textarea,
  useToast,
} from '@/components/ui';
import { workspacesApi } from '@/lib/api/workspaces';
import { useWorkspace } from '@/providers/app-providers';
export default function WorkspaceSettingsPage() {
  const { current, reload } = useWorkspace();
  const { show, toast } = useToast();
  const [nameDraft, setName] = useState<string | null>(null);
  const [descriptionDraft, setDescription] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const name = nameDraft ?? current?.workspace.name ?? '';
  const description = descriptionDraft ?? current?.workspace.description ?? '';
  const save = useMutation({
    mutationFn: () => workspacesApi.update(current!.workspaceId, { name, description }),
    onSuccess: async () => {
      await reload();
      show('Espacio actualizado.');
    },
  });
  const destroy = useMutation({
    mutationFn: () => workspacesApi.remove(current!.workspaceId),
    onSuccess: async () => {
      await reload();
      setConfirm(false);
      show('Espacio archivado.');
    },
  });
  return (
    <>
      <PageHeader
        title="Configuración del espacio"
        description="Nombre, descripción y ciclo de vida del workspace."
      />
      <section className="settings-panel">
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Nombre">
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Descripción">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="read-only-grid">
            <div>
              <span>Tipo</span>
              <strong>{current?.workspace.type === 'BUSINESS' ? 'Negocio' : 'Personal'}</strong>
            </div>
            <div>
              <span>Moneda</span>
              <strong>{current?.workspace.currencyCode}</strong>
            </div>
            <div>
              <span>Zona horaria</span>
              <strong>{current?.workspace.timezone}</strong>
            </div>
          </div>
          {save.error && <ErrorMessage error={save.error} />}
          <div className="form-actions">
            <Button disabled={save.isPending}>Guardar cambios</Button>
          </div>
        </form>
        <div className="danger-zone">
          <div>
            <h2>Archivar espacio</h2>
            <p>Ocultará el workspace y sus datos operativos.</p>
          </div>
          <Button variant="danger" onClick={() => setConfirm(true)}>
            Archivar
          </Button>
        </div>
      </section>
      <ConfirmDialog
        open={confirm}
        title="Archivar espacio"
        description="El espacio dejará de aparecer para sus miembros. Esta acción no elimina físicamente el historial."
        onClose={() => setConfirm(false)}
        onConfirm={() => destroy.mutate()}
        busy={destroy.isPending}
      />
      {toast}
    </>
  );
}
