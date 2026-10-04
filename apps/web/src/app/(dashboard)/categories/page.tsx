'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useState } from 'react';
import {
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
import { financeApi } from '@/lib/api/finance';
import { canManageOperations } from '@/lib/permissions';
import { useWorkspace } from '@/providers/app-providers';
import type { Category, TransactionType } from '@/types/api';
const empty = { name: '', type: 'EXPENSE' as TransactionType, parentId: '', active: true };
export default function CategoriesPage() {
  const { current } = useWorkspace();
  const id = current?.workspaceId ?? '';
  const qc = useQueryClient();
  const manage = canManageOperations(current?.role);
  const { show, toast } = useToast();
  const query = useQuery({
    queryKey: ['categories', id],
    queryFn: () => financeApi.categories(id),
    enabled: Boolean(id),
  });
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);
  const [remove, setRemove] = useState<Category | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['categories', id] });
  const save = useMutation({
    mutationFn: () =>
      financeApi.saveCategory(id, { ...form, parentId: form.parentId || null }, editing?.id),
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      show(editing ? 'Categoría actualizada.' : 'Categoría creada.');
    },
  });
  const destroy = useMutation({
    mutationFn: () => financeApi.removeCategory(id, remove!.id),
    onSuccess: async () => {
      await refresh();
      setRemove(null);
      show('Categoría eliminada.');
    },
  });
  const start = (item?: Category, parent?: Category) => {
    setEditing(item ?? null);
    setForm(
      item
        ? { name: item.name, type: item.type, parentId: item.parentId ?? '', active: item.active }
        : { ...empty, type: parent?.type ?? 'EXPENSE', parentId: parent?.id ?? '' },
    );
    setOpen(true);
  };
  const tree = (type: TransactionType) =>
    (query.data ?? []).filter((c) => c.type === type && !c.parentId);
  const branch = (item: Category) => (
    <div className="category-row" key={item.id}>
      <span>
        <strong>{item.name}</strong>
        {!item.active && <small>Inactiva</small>}
      </span>
      {manage && (
        <details className="row-menu">
          <summary>
            <MoreHorizontal />
          </summary>
          <div>
            <button onClick={() => start(undefined, item)}>Crear subcategoría</button>
            <button onClick={() => start(item)}>Editar</button>
            <button className="danger-text" onClick={() => setRemove(item)}>
              Eliminar
            </button>
          </div>
        </details>
      )}
      <div className="category-children">
        {query.data?.filter((c) => c.parentId === item.id).map((child) => branch(child))}
      </div>
    </div>
  );
  return (
    <>
      <PageHeader
        title="Categorías"
        description="Organiza ingresos y gastos con una jerarquía sencilla."
        action={
          manage ? (
            <Button onClick={() => start()}>
              <Plus size={16} /> Nueva categoría
            </Button>
          ) : undefined
        }
      />
      {query.isLoading ? (
        <Skeleton lines={7} />
      ) : !query.data?.length ? (
        <EmptyState
          title="Sin categorías"
          description="Crea categorías para clasificar tus movimientos."
        />
      ) : (
        <div className="two-columns">
          <section className="panel">
            <header>
              <div>
                <h2>Ingresos</h2>
                <p>Categorías para entradas de dinero</p>
              </div>
            </header>
            <div className="category-tree">{tree('INCOME').map(branch)}</div>
          </section>
          <section className="panel">
            <header>
              <div>
                <h2>Gastos</h2>
                <p>Categorías para salidas de dinero</p>
              </div>
            </header>
            <div className="category-tree">{tree('EXPENSE').map(branch)}</div>
          </section>
        </div>
      )}
      <Modal
        open={open}
        title={
          editing ? 'Editar categoría' : form.parentId ? 'Nueva subcategoría' : 'Nueva categoría'
        }
        onClose={() => setOpen(false)}
      >
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Nombre">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Tipo">
            <Select
              disabled={Boolean(form.parentId)}
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as TransactionType, parentId: '' })
              }
            >
              <option value="INCOME">Ingreso</option>
              <option value="EXPENSE">Gasto</option>
            </Select>
          </Field>
          <Field label="Categoría superior">
            <Select
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">Sin categoría superior</option>
              {query.data
                ?.filter((c) => c.type === form.type && c.id !== editing?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />{' '}
            Categoría activa
          </label>
          {save.error && <ErrorMessage error={save.error} />}
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button>Guardar</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(remove)}
        title="Eliminar categoría"
        description="La categoría dejará de estar disponible. Los movimientos históricos se conservarán."
        onClose={() => setRemove(null)}
        onConfirm={() => destroy.mutate()}
        busy={destroy.isPending}
      />
      {toast}
    </>
  );
}
