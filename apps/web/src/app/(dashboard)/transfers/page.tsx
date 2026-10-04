'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, MoreHorizontal, Plus } from 'lucide-react';
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
  useToast,
} from '@/components/ui';
import { financeApi } from '@/lib/api/finance';
import { formatDate, today } from '@/lib/dates';
import { formatMoney, normalizeMoneyInput } from '@/lib/money';
import { canWriteFinance } from '@/lib/permissions';
import { useWorkspace } from '@/providers/app-providers';
import type { Transfer } from '@/types/api';
const empty = {
  sourceAccountId: '',
  destinationAccountId: '',
  amount: '',
  transactionDate: today(),
  description: '',
};
export default function TransfersPage() {
  const { current } = useWorkspace();
  const id = current?.workspaceId ?? '';
  const qc = useQueryClient();
  const { show, toast } = useToast();
  const write = canWriteFinance(current?.role);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Transfer | null>(null);
  const [remove, setRemove] = useState<Transfer | null>(null);
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ['transfers', id, page],
    queryFn: () => financeApi.transfers(id, { page, limit: 20 }),
    enabled: Boolean(id),
  });
  const accounts = useQuery({
    queryKey: ['accounts', id],
    queryFn: () => financeApi.accounts(id),
    enabled: Boolean(id),
  });
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['transfers', id] });
    await qc.invalidateQueries({ queryKey: ['balances', id] });
    await qc.invalidateQueries({ queryKey: ['dashboard', id] });
  };
  const save = useMutation({
    mutationFn: () => financeApi.saveTransfer(id, form, editing?.id),
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      show(editing ? 'Transferencia actualizada.' : 'Transferencia registrada.');
    },
  });
  const destroy = useMutation({
    mutationFn: () => financeApi.removeTransfer(id, remove!.id),
    onSuccess: async () => {
      await refresh();
      setRemove(null);
      show('Transferencia eliminada.');
    },
  });
  const start = (item?: Transfer) => {
    setEditing(item ?? null);
    setForm(
      item
        ? {
            sourceAccountId: item.sourceAccountId,
            destinationAccountId: item.destinationAccountId,
            amount: item.amount,
            transactionDate: item.transactionDate.slice(0, 10),
            description: item.description ?? '',
          }
        : empty,
    );
    setOpen(true);
  };
  const accountName = (accountId: string) =>
    accounts.data?.find((a) => a.id === accountId)?.name ?? 'Cuenta';
  return (
    <>
      <PageHeader
        title="Transferencias"
        description="Movimientos internos entre cuentas del mismo espacio."
        action={
          write ? (
            <Button onClick={() => start()}>
              <Plus size={16} /> Nueva transferencia
            </Button>
          ) : undefined
        }
      />
      {query.isLoading ? (
        <Skeleton lines={6} />
      ) : !query.data?.data.length ? (
        <EmptyState
          title="Sin transferencias"
          description="Mueve dinero entre tus cuentas sin registrarlo como ingreso o gasto."
          action={write ? <Button onClick={() => start()}>Crear transferencia</Button> : undefined}
        />
      ) : (
        <section className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Origen</th>
                <th></th>
                <th>Destino</th>
                <th>Descripción</th>
                <th className="amount-cell">Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.transactionDate)}</td>
                  <td>
                    <strong>{accountName(item.sourceAccountId)}</strong>
                  </td>
                  <td>
                    <ArrowRight size={16} className="muted" />
                  </td>
                  <td>
                    <strong>{accountName(item.destinationAccountId)}</strong>
                  </td>
                  <td>{item.description || '—'}</td>
                  <td className="amount-cell">{formatMoney(item.amount, item.currencyCode)}</td>
                  <td>
                    {write && (
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
        title={editing ? 'Editar transferencia' : 'Nueva transferencia'}
        onClose={() => setOpen(false)}
      >
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field label="Cuenta de origen">
            <Select
              required
              value={form.sourceAccountId}
              onChange={(e) => setForm({ ...form, sourceAccountId: e.target.value })}
            >
              <option value="">Selecciona una cuenta</option>
              {accounts.data
                ?.filter((a) => a.id !== form.destinationAccountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Cuenta de destino">
            <Select
              required
              value={form.destinationAccountId}
              onChange={(e) => setForm({ ...form, destinationAccountId: e.target.value })}
            >
              <option value="">Selecciona una cuenta</option>
              {accounts.data
                ?.filter((a) => a.id !== form.sourceAccountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
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
            <Field label="Fecha">
              <Input
                required
                type="date"
                value={form.transactionDate}
                onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Descripción">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          {form.sourceAccountId && form.sourceAccountId === form.destinationAccountId && (
            <ErrorMessage
              error={new Error('La cuenta de origen y destino deben ser diferentes.')}
            />
          )}
          {save.error && <ErrorMessage error={save.error} />}
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={save.isPending || form.sourceAccountId === form.destinationAccountId}>
              Guardar
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(remove)}
        title="Eliminar transferencia"
        description="La transferencia dejará de afectar los saldos de ambas cuentas."
        onClose={() => setRemove(null)}
        onConfirm={() => destroy.mutate()}
        busy={destroy.isPending}
      />
      {toast}
    </>
  );
}
