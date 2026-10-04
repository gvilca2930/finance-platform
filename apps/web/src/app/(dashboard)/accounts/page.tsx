'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Plus, WalletCards } from 'lucide-react';
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
  Textarea,
  useToast,
} from '@/components/ui';
import { financeApi } from '@/lib/api/finance';
import { labels } from '@/lib/labels';
import { formatMoney, normalizeMoneyInput } from '@/lib/money';
import { canManageOperations } from '@/lib/permissions';
import { useWorkspace } from '@/providers/app-providers';
import type { Account, AccountType } from '@/types/api';
const empty = {
  name: '',
  type: 'BANK' as AccountType,
  initialBalance: '0.00',
  description: '',
  active: true,
};
export default function AccountsPage() {
  const { current } = useWorkspace();
  const id = current?.workspaceId ?? '';
  const qc = useQueryClient();
  const { show, toast } = useToast();
  const manage = canManageOperations(current?.role);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Account | null>(null);
  const [remove, setRemove] = useState<Account | null>(null);
  const [open, setOpen] = useState(false);
  const accounts = useQuery({
    queryKey: ['accounts', id],
    queryFn: () => financeApi.accounts(id),
    enabled: Boolean(id),
  });
  const balances = useQuery({
    queryKey: ['balances', id],
    queryFn: () => financeApi.balances(id),
    enabled: Boolean(id),
  });
  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ['accounts', id] });
    await qc.invalidateQueries({ queryKey: ['balances', id] });
    await qc.invalidateQueries({ queryKey: ['dashboard', id] });
  };
  const save = useMutation({
    mutationFn: () => financeApi.saveAccount(id, form, editing?.id),
    onSuccess: async () => {
      await refresh();
      setOpen(false);
      show(editing ? 'Cuenta actualizada.' : 'Cuenta creada.');
    },
  });
  const destroy = useMutation({
    mutationFn: () => financeApi.removeAccount(id, remove!.id),
    onSuccess: async () => {
      await refresh();
      setRemove(null);
      show('Cuenta eliminada.');
    },
  });
  const start = (item?: Account) => {
    setEditing(item ?? null);
    setForm(
      item
        ? {
            name: item.name,
            type: item.type,
            initialBalance: item.initialBalance,
            description: item.description ?? '',
            active: item.active,
          }
        : empty,
    );
    setOpen(true);
  };
  return (
    <>
      <PageHeader
        title="Cuentas"
        description="Saldos calculados por el backend a partir de tus operaciones."
        action={
          manage ? (
            <Button onClick={() => start()}>
              <Plus size={16} /> Nueva cuenta
            </Button>
          ) : undefined
        }
      />
      {accounts.isLoading || balances.isLoading ? (
        <Skeleton lines={6} />
      ) : !accounts.data?.length ? (
        <EmptyState
          title="Aún no tienes cuentas financieras"
          description="Agrega tu primera cuenta para comenzar a registrar movimientos."
          action={manage ? <Button onClick={() => start()}>Crear cuenta</Button> : undefined}
        />
      ) : (
        <div className="account-cards">
          {accounts.data.map((item) => {
            const balance = balances.data?.accounts.find((b) => b.accountId === item.id);
            return (
              <article className="account-card" key={item.id}>
                <header>
                  <span className="account-symbol">
                    <WalletCards />
                  </span>
                  <div>
                    <h2>{item.name}</h2>
                    <p>{labels.accountTypes[item.type]}</p>
                  </div>
                  {manage && (
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
                </header>
                <strong>
                  {formatMoney(balance?.balance ?? item.initialBalance, item.currencyCode)}
                </strong>
                <footer>
                  <Badge tone={item.active ? 'success' : 'neutral'}>
                    {item.active ? 'Activa' : 'Inactiva'}
                  </Badge>
                  <span>Saldo inicial {formatMoney(item.initialBalance, item.currencyCode)}</span>
                </footer>
              </article>
            );
          })}
        </div>
      )}
      <Modal
        open={open}
        title={editing ? 'Editar cuenta' : 'Nueva cuenta'}
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
          <div className="form-row">
            <Field label="Tipo">
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
              >
                {Object.entries(labels.accountTypes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Saldo inicial">
              <Input
                required
                inputMode="decimal"
                value={form.initialBalance}
                onChange={(e) =>
                  setForm({ ...form, initialBalance: normalizeMoneyInput(e.target.value) })
                }
              />
            </Field>
          </div>
          <Field label="Descripción">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />{' '}
            Cuenta activa
          </label>
          {save.error && <ErrorMessage error={save.error} />}
          <div className="form-actions">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={save.isPending}>Guardar</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(remove)}
        title="Eliminar cuenta"
        description="La cuenta dejará de estar disponible para nuevas operaciones. Su historial se conservará."
        onClose={() => setRemove(null)}
        onConfirm={() => destroy.mutate()}
        busy={destroy.isPending}
      />
      {toast}
    </>
  );
}
