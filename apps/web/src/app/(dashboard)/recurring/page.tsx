'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, MoreHorizontal, Plus } from 'lucide-react';
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
  Pagination,
  Select,
  Skeleton,
  useToast,
} from '@/components/ui';
import { financeApi } from '@/lib/api/finance';
import { formatDate, today } from '@/lib/dates';
import { labels } from '@/lib/labels';
import { formatMoney, normalizeMoneyInput } from '@/lib/money';
import { canManageOperations } from '@/lib/permissions';
import { useWorkspace } from '@/providers/app-providers';
import type { Frequency, RecurringTransaction, TransactionType } from '@/types/api';
const empty = {
  accountId: '',
  categoryId: '',
  type: 'EXPENSE' as TransactionType,
  amount: '',
  frequency: 'MONTHLY' as Frequency,
  startDate: today(),
  nextExecutionDate: today(),
  description: '',
  active: true,
};
export default function RecurringPage() {
  const { current } = useWorkspace();
  const id = current?.workspaceId ?? '';
  const qc = useQueryClient();
  const { show, toast } = useToast();
  const manage = canManageOperations(current?.role);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<RecurringTransaction | null>(null);
  const [remove, setRemove] = useState<RecurringTransaction | null>(null);
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ['recurring', id, page],
    queryFn: () => financeApi.recurring(id, page),
    enabled: Boolean(id),
  });
  const accounts = useQuery({
    queryKey: ['accounts', id],
    queryFn: () => financeApi.accounts(id),
    enabled: Boolean(id),
  });
  const categories = useQuery({
    queryKey: ['categories', id],
    queryFn: () => financeApi.categories(id),
    enabled: Boolean(id),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['recurring', id] });
  const save = useMutation({
    mutationFn: () => financeApi.saveRecurring(id, form, editing?.id),
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      show(editing ? 'Definición actualizada.' : 'Definición recurrente creada.');
    },
  });
  const destroy = useMutation({
    mutationFn: () => financeApi.removeRecurring(id, remove!.id),
    onSuccess: async () => {
      await refresh();
      setRemove(null);
      show('Definición desactivada.');
    },
  });
  const start = (item?: RecurringTransaction) => {
    setEditing(item ?? null);
    setForm(
      item
        ? {
            accountId: item.accountId,
            categoryId: item.categoryId,
            type: item.type,
            amount: item.amount,
            frequency: item.frequency,
            startDate: item.startDate.slice(0, 10),
            nextExecutionDate: item.nextExecutionDate.slice(0, 10),
            description: item.description,
            active: item.active,
          }
        : empty,
    );
    setOpen(true);
  };
  const name = (items: Array<{ id: string; name: string }> | undefined, target: string) =>
    items?.find((x) => x.id === target)?.name ?? '—';
  return (
    <>
      <PageHeader
        title="Movimientos recurrentes"
        description="Administra definiciones para operaciones periódicas."
        action={
          manage ? (
            <Button onClick={() => start()}>
              <Plus size={16} /> Nueva definición
            </Button>
          ) : undefined
        }
      />
      <div className="notice">
        <Info size={18} />
        <span>
          <strong>Ejecución manual por ahora.</strong> Los movimientos recurrentes aún no se
          ejecutan automáticamente.
        </span>
      </div>
      {query.isLoading ? (
        <Skeleton lines={6} />
      ) : !query.data?.data.length ? (
        <EmptyState
          title="Sin movimientos recurrentes"
          description="Crea una definición para preparar tus operaciones periódicas."
        />
      ) : (
        <section className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Descripción</th>
                <th>Cuenta</th>
                <th>Categoría</th>
                <th>Frecuencia</th>
                <th>Próxima fecha</th>
                <th className="amount-cell">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.description}</strong>
                    <small>
                      <Badge tone={item.active ? 'success' : 'neutral'}>
                        {item.active ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </small>
                  </td>
                  <td>{name(accounts.data, item.accountId)}</td>
                  <td>{name(categories.data, item.categoryId)}</td>
                  <td>{labels.frequencies[item.frequency]}</td>
                  <td>{formatDate(item.nextExecutionDate)}</td>
                  <td className="amount-cell">{formatMoney(item.amount)}</td>
                  <td>
                    {manage && (
                      <details className="row-menu">
                        <summary>
                          <MoreHorizontal />
                        </summary>
                        <div>
                          <button onClick={() => start(item)}>Editar</button>
                          <button className="danger-text" onClick={() => setRemove(item)}>
                            Desactivar
                          </button>
                        </div>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={query.data.pagination.page}
            totalPages={query.data.pagination.totalPages}
            onPage={setPage}
          />
        </section>
      )}
      <Modal
        open={open}
        title={editing ? 'Editar recurrente' : 'Nuevo recurrente'}
        onClose={() => setOpen(false)}
      >
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="form-row">
            <Field label="Tipo">
              <Select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as TransactionType, categoryId: '' })
                }
              >
                <option value="EXPENSE">Gasto</option>
                <option value="INCOME">Ingreso</option>
              </Select>
            </Field>
            <Field label="Frecuencia">
              <Select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}
              >
                {Object.entries(labels.frequencies).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Descripción">
            <Input
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Monto">
            <Input
              required
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: normalizeMoneyInput(e.target.value) })}
            />
          </Field>
          <div className="form-row">
            <Field label="Cuenta">
              <Select
                required
                value={form.accountId}
                onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              >
                <option value="">Selecciona</option>
                {accounts.data?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Categoría">
              <Select
                required
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">Selecciona</option>
                {categories.data
                  ?.filter((c) => c.type === form.type)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
          <div className="form-row">
            <Field label="Fecha inicial">
              <Input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </Field>
            <Field label="Próxima fecha">
              <Input
                type="date"
                required
                min={form.startDate}
                value={form.nextExecutionDate}
                onChange={(e) => setForm({ ...form, nextExecutionDate: e.target.value })}
              />
            </Field>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />{' '}
            Definición activa
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
        title="Desactivar recurrente"
        description="La definición quedará inactiva y conservará su historial."
        onClose={() => setRemove(null)}
        onConfirm={() => destroy.mutate()}
        busy={destroy.isPending}
        confirmLabel="Desactivar"
        busyLabel="Desactivando…"
      />
      {toast}
    </>
  );
}
