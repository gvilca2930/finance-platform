'use client';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { currentMonth } from '@/lib/dates';
import { formatMoney, normalizeMoneyInput } from '@/lib/money';
import { canManageOperations } from '@/lib/permissions';
import { useWorkspace } from '@/providers/app-providers';
import type { Budget } from '@/types/api';
const now = currentMonth();
const empty = {
  categoryId: '',
  amount: '',
  month: now.month,
  year: now.year,
  alertPercentage: '80.00',
};
export default function BudgetsPage() {
  const { current } = useWorkspace();
  const id = current?.workspaceId ?? '';
  const qc = useQueryClient();
  const { show, toast } = useToast();
  const manage = canManageOperations(current?.role);
  const [period, setPeriod] = useState(now);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [remove, setRemove] = useState<Budget | null>(null);
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ['budgets', id, period],
    queryFn: () => financeApi.budgets(id, { ...period, page: 1, limit: 100 }),
    enabled: Boolean(id),
  });
  const categories = useQuery({
    queryKey: ['categories', id],
    queryFn: () => financeApi.categories(id),
    enabled: Boolean(id),
  });
  const progress = useQueries({
    queries: (query.data?.data ?? []).map((b) => ({
      queryKey: ['budget-progress', id, b.id],
      queryFn: () => financeApi.budgetProgress(id, b.id),
    })),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['budgets', id] });
  const save = useMutation({
    mutationFn: () => financeApi.saveBudget(id, form, editing?.id),
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      show(editing ? 'Presupuesto actualizado.' : 'Presupuesto creado.');
    },
  });
  const destroy = useMutation({
    mutationFn: () => financeApi.removeBudget(id, remove!.id),
    onSuccess: async () => {
      await refresh();
      setRemove(null);
      show('Presupuesto eliminado.');
    },
  });
  const start = (item?: Budget) => {
    setEditing(item ?? null);
    setForm(
      item
        ? {
            categoryId: item.categoryId,
            amount: item.amount,
            month: item.month,
            year: item.year,
            alertPercentage: item.alertPercentage ?? '80.00',
          }
        : { ...empty, ...period },
    );
    setOpen(true);
  };
  const categoryName = (categoryId: string) =>
    categories.data?.find((c) => c.id === categoryId)?.name ?? 'Categoría';
  return (
    <>
      <PageHeader
        title="Presupuestos"
        description="Planifica límites mensuales para tus categorías de gasto."
        action={
          manage ? (
            <Button onClick={() => start()}>
              <Plus size={16} /> Nuevo presupuesto
            </Button>
          ) : undefined
        }
      />
      <section className="period-picker">
        <Select
          value={period.month}
          onChange={(e) => setPeriod({ ...period, month: Number(e.target.value) })}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Intl.DateTimeFormat('es-PE', { month: 'long' }).format(new Date(2026, i, 1))}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          min={2000}
          max={2200}
          value={period.year}
          onChange={(e) => setPeriod({ ...period, year: Number(e.target.value) })}
        />
      </section>
      {query.isLoading ? (
        <Skeleton lines={6} />
      ) : !query.data?.data.length ? (
        <EmptyState
          title="Sin presupuestos para este mes"
          description="Define un límite para controlar tus gastos por categoría."
          action={manage ? <Button onClick={() => start()}>Crear presupuesto</Button> : undefined}
        />
      ) : (
        <div className="budget-grid">
          {query.data.data.map((item, index) => {
            const p = progress[index]?.data;
            const value = Number(p?.percentageUsed ?? 0);
            return (
              <article className="budget-card" key={item.id}>
                <header>
                  <div>
                    <h2>{categoryName(item.categoryId)}</h2>
                    <p>
                      {value >= 100
                        ? 'Límite excedido'
                        : value >= Number(item.alertPercentage ?? 80)
                          ? 'Cerca del límite'
                          : 'Dentro del presupuesto'}
                    </p>
                  </div>
                  {manage && (
                    <details className="row-menu">
                      <summary>
                        <MoreHorizontal />
                      </summary>
                      <div>
                        <button onClick={() => start(item)}>Editar</button>
                        <button className="danger-text" onClick={() => setRemove(item)}>
                          Eliminar
                        </button>
                      </div>
                    </details>
                  )}
                </header>
                <div className="budget-values">
                  <strong>{formatMoney(p?.spent ?? '0.00')}</strong>
                  <span>/ {formatMoney(item.amount)}</span>
                </div>
                <div
                  className={`progress ${value >= 100 ? 'is-danger' : value >= Number(item.alertPercentage ?? 80) ? 'is-warning' : ''}`}
                >
                  <span style={{ width: `${Math.min(100, value)}%` }} />
                </div>
                <footer>
                  <span>{value.toFixed(2)}%</span>
                  <span>
                    Restante <strong>{formatMoney(p?.remaining ?? item.amount)}</strong>
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
      )}
      <Modal
        open={open}
        title={editing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
        onClose={() => setOpen(false)}
      >
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Categoría de gasto">
            <Select
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Selecciona una categoría</option>
              {categories.data
                ?.filter((c) => c.type === 'EXPENSE')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </Field>
          <div className="form-row">
            <Field label="Monto">
              <Input
                required
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: normalizeMoneyInput(e.target.value) })}
              />
            </Field>
            <Field label="Alerta (%)">
              <Input
                type="number"
                min="0"
                max="100"
                value={form.alertPercentage}
                onChange={(e) => setForm({ ...form, alertPercentage: e.target.value })}
              />
            </Field>
          </div>
          <div className="form-row">
            <Field label="Mes">
              <Input
                type="number"
                min="1"
                max="12"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: Number(e.target.value) })}
              />
            </Field>
            <Field label="Año">
              <Input
                type="number"
                min="2000"
                max="2200"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
              />
            </Field>
          </div>
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
        title="Eliminar presupuesto"
        description="Dejarás de ver su seguimiento para este periodo. Los movimientos no se modificarán."
        onClose={() => setRemove(null)}
        onConfirm={() => destroy.mutate()}
        busy={destroy.isPending}
      />
      {toast}
    </>
  );
}
