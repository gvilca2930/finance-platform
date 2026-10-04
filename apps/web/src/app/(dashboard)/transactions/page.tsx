'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
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
  Pagination,
  Select,
  Skeleton,
  Textarea,
  useToast,
} from '@/components/ui';
import { financeApi } from '@/lib/api/finance';
import { formatDate, today } from '@/lib/dates';
import { normalizeMoneyInput, signedMoney } from '@/lib/money';
import { canWriteFinance } from '@/lib/permissions';
import { useWorkspace } from '@/providers/app-providers';
import type { Transaction, TransactionType } from '@/types/api';

const blank = {
  type: 'EXPENSE' as TransactionType,
  amount: '',
  accountId: '',
  categoryId: '',
  transactionDate: today(),
  description: '',
  notes: '',
};
export default function TransactionsPage() {
  const params = useSearchParams();
  const { current } = useWorkspace();
  const workspaceId = current?.workspaceId ?? '';
  const queryClient = useQueryClient();
  const { show, toast } = useToast();
  const [page, setPage] = useState(Number(params.get('page') ?? 1));
  const [type, setType] = useState(params.get('type') ?? '');
  const [search, setSearch] = useState(params.get('search') ?? '');
  const requested = params.get('new');
  const requestedType = requested === 'INCOME' || requested === 'EXPENSE' ? requested : undefined;
  const [form, setForm] = useState<typeof blank>(() => ({
    ...blank,
    type: requestedType ?? blank.type,
  }));
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [remove, setRemove] = useState<Transaction | null>(null);
  const [open, setOpen] = useState(() => Boolean(requestedType));
  const accounts = useQuery({
    queryKey: ['accounts', workspaceId],
    queryFn: () => financeApi.accounts(workspaceId),
    enabled: Boolean(workspaceId),
  });
  const categories = useQuery({
    queryKey: ['categories', workspaceId],
    queryFn: () => financeApi.categories(workspaceId),
    enabled: Boolean(workspaceId),
  });
  const transactions = useQuery({
    queryKey: ['transactions', workspaceId, page, type, search],
    queryFn: () =>
      financeApi.transactions(workspaceId, {
        page,
        limit: 20,
        type: type || undefined,
        search: search || undefined,
      }),
    enabled: Boolean(workspaceId),
  });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['transactions', workspaceId] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard', workspaceId] });
  };
  const save = useMutation({
    mutationFn: () => financeApi.saveTransaction(workspaceId, form, editing?.id),
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      show(editing ? 'Movimiento actualizado.' : 'Movimiento registrado.');
    },
  });
  const destroy = useMutation({
    mutationFn: () => financeApi.removeTransaction(workspaceId, remove!.id),
    onSuccess: async () => {
      await refresh();
      setRemove(null);
      show('Movimiento eliminado.');
    },
  });
  const start = (item?: Transaction, requested?: TransactionType) => {
    setEditing(item ?? null);
    setForm(
      item
        ? {
            type: item.type,
            amount: item.amount,
            accountId: item.accountId,
            categoryId: item.categoryId,
            transactionDate: item.transactionDate.slice(0, 10),
            description: item.description,
            notes: item.notes ?? '',
          }
        : { ...blank, type: requested ?? 'EXPENSE' },
    );
    setOpen(true);
  };
  const visibleCategories = (categories.data ?? []).filter(
    (item) => item.type === form.type && item.active,
  );
  return (
    <>
      <PageHeader
        title="Movimientos"
        description="Gestiona los ingresos y gastos de este espacio."
        action={
          canWriteFinance(current?.role) ? (
            <Button onClick={() => start()}>
              <Plus size={16} /> Nuevo movimiento
            </Button>
          ) : undefined
        }
      />
      <section className="toolbar">
        <label className="search-input">
          <Search size={16} />
          <Input
            aria-label="Buscar movimientos"
            placeholder="Buscar por concepto o nota"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <Select
          aria-label="Filtrar por tipo"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los tipos</option>
          <option value="INCOME">Ingresos</option>
          <option value="EXPENSE">Gastos</option>
        </Select>
      </section>
      {transactions.isLoading ? (
        <Skeleton lines={7} />
      ) : transactions.error ? (
        <ErrorMessage error={transactions.error} />
      ) : !transactions.data?.data.length ? (
        <EmptyState
          title="Sin movimientos"
          description="Registra un ingreso o gasto para comenzar a construir tu historial financiero."
          action={
            canWriteFinance(current?.role) ? (
              <Button onClick={() => start()}>Registrar movimiento</Button>
            ) : undefined
          }
        />
      ) : (
        <section className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>Cuenta</th>
                <th className="amount-cell">Monto</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.data.data.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.transactionDate)}</td>
                  <td>
                    <strong>{item.description}</strong>
                    {item.notes && <small>{item.notes}</small>}
                  </td>
                  <td>{item.category.name}</td>
                  <td>{item.account.name}</td>
                  <td
                    className={`amount-cell ${item.type === 'INCOME' ? 'money-income' : 'money-expense'}`}
                  >
                    {signedMoney(item.amount, item.type, item.currencyCode)}
                  </td>
                  <td>
                    {canWriteFinance(current?.role) && (
                      <details className="row-menu">
                        <summary aria-label="Acciones">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={transactions.data.pagination.page}
            totalPages={transactions.data.pagination.totalPages}
            onPage={setPage}
          />
        </section>
      )}
      <Modal
        open={open}
        title={
          editing
            ? 'Editar movimiento'
            : form.type === 'EXPENSE'
              ? 'Registrar gasto'
              : 'Registrar ingreso'
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
          <div className="segmented">
            <button
              type="button"
              className={form.type === 'EXPENSE' ? 'active' : ''}
              onClick={() => setForm({ ...form, type: 'EXPENSE', categoryId: '' })}
            >
              Gasto
            </button>
            <button
              type="button"
              className={form.type === 'INCOME' ? 'active' : ''}
              onClick={() => setForm({ ...form, type: 'INCOME', categoryId: '' })}
            >
              Ingreso
            </button>
          </div>
          <div className="form-row">
            <Field label="Monto">
              <Input
                required
                inputMode="decimal"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: normalizeMoneyInput(e.target.value) })}
              />
            </Field>
            <Field label="Fecha">
              <Input
                required
                type="date"
                value={form.transactionDate}
                onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Cuenta">
            <Select
              required
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            >
              <option value="">Selecciona una cuenta</option>
              {accounts.data
                ?.filter((a) => a.active)
                .map((a) => (
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
              <option value="">Selecciona una categoría</option>
              {visibleCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Descripción">
            <Input
              required
              maxLength={250}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Notas">
            <Textarea
              maxLength={1000}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          {save.error && <ErrorMessage error={save.error} />}
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={save.isPending}>{save.isPending ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(remove)}
        title="Eliminar movimiento"
        description="El movimiento dejará de aparecer en saldos y reportes."
        onClose={() => setRemove(null)}
        onConfirm={() => destroy.mutate()}
        busy={destroy.isPending}
      />
      {toast}
    </>
  );
}
