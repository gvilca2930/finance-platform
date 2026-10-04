'use client';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { CategoryChart } from '@/components/charts/finance-charts';
import { Badge, EmptyState, PageHeader, Skeleton } from '@/components/ui';
import { financeApi } from '@/lib/api/finance';
import { formatDate } from '@/lib/dates';
import { formatMoney, signedMoney } from '@/lib/money';
import { canWriteFinance } from '@/lib/permissions';
import { useWorkspace } from '@/providers/app-providers';

export default function DashboardPage() {
  const { current } = useWorkspace();
  const id = current?.workspaceId ?? '';
  const query = useQuery({
    queryKey: ['dashboard', id],
    queryFn: () => financeApi.dashboard(id),
    enabled: Boolean(id),
  });
  if (query.isLoading)
    return (
      <>
        <PageHeader title="Dashboard" description="Resumen de tu actividad financiera." />
        <Skeleton lines={8} />
      </>
    );
  if (!query.data)
    return (
      <EmptyState
        title="Sin información financiera"
        description="Crea una cuenta y registra tu primer movimiento para ver el resumen."
      />
    );
  const d = query.data;
  const budgetPercentage =
    Number(d.budget.total) > 0
      ? Math.min(100, (Number(d.budget.spent) / Number(d.budget.total)) * 100)
      : 0;
  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${formatDate(d.period.from)} — ${formatDate(d.period.to)}`}
        action={
          canWriteFinance(current?.role) ? (
            <div className="header-actions">
              <Link className="button button--secondary" href="/transactions?new=INCOME">
                <ArrowDownLeft size={16} /> Registrar ingreso
              </Link>
              <Link className="button button--primary" href="/transactions?new=EXPENSE">
                <Plus size={16} /> Registrar gasto
              </Link>
            </div>
          ) : undefined
        }
      />
      <section className="stats-strip">
        <div>
          <span>Saldo total</span>
          <strong>{formatMoney(d.totalBalance, d.currencyCode)}</strong>
        </div>
        <div>
          <span>Ingresos del mes</span>
          <strong className="money-income">{formatMoney(d.totalIncome, d.currencyCode)}</strong>
        </div>
        <div>
          <span>Gastos del mes</span>
          <strong className="money-expense">{formatMoney(d.totalExpenses, d.currencyCode)}</strong>
        </div>
        <div>
          <span>Flujo neto</span>
          <strong>{formatMoney(d.netCashFlow, d.currencyCode)}</strong>
        </div>
      </section>
      <div className="dashboard-grid">
        <section className="panel panel--wide">
          <header>
            <div>
              <h2>Ingresos y gastos</h2>
              <p>Distribución por categoría en el periodo</p>
            </div>
          </header>
          <div className="split-charts">
            <div>
              <h3>Gastos</h3>
              {d.expensesByCategory.length ? (
                <CategoryChart data={d.expensesByCategory} />
              ) : (
                <p className="muted">Sin gastos en este periodo.</p>
              )}
            </div>
            <div>
              <h3>Ingresos</h3>
              {d.incomeByCategory.length ? (
                <CategoryChart data={d.incomeByCategory} />
              ) : (
                <p className="muted">Sin ingresos en este periodo.</p>
              )}
            </div>
          </div>
        </section>
        <section className="panel">
          <header>
            <div>
              <h2>Presupuesto</h2>
              <p>Uso acumulado del periodo</p>
            </div>
          </header>
          <div className="budget-summary">
            <strong>{formatMoney(d.budget.spent)}</strong>
            <span>de {formatMoney(d.budget.total)}</span>
            <div className="progress">
              <span style={{ width: `${budgetPercentage}%` }} />
            </div>
            <p>
              Restante <b>{formatMoney(d.budget.remaining)}</b>
            </p>
          </div>
        </section>
        <section className="panel">
          <header>
            <div>
              <h2>Saldos por cuenta</h2>
              <p>{d.accountBalances.length} cuentas visibles</p>
            </div>
            <Link href="/accounts">Ver cuentas</Link>
          </header>
          <div className="account-list">
            {d.accountBalances.map((account) => (
              <div key={account.accountId}>
                <span>
                  {account.name}
                  <small>{account.type}</small>
                </span>
                <strong>{formatMoney(account.balance, account.currencyCode)}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel panel--full">
          <header>
            <div>
              <h2>Movimientos recientes</h2>
              <p>Últimos ingresos y gastos registrados</p>
            </div>
            <Link href="/transactions">Ver todos</Link>
          </header>
          <div className="compact-list">
            {d.recentTransactions.map((item) => (
              <div key={item.id}>
                <span className={`movement-icon movement-icon--${item.type.toLowerCase()}`}>
                  {item.type === 'INCOME' ? <ArrowDownLeft /> : <ArrowUpRight />}
                </span>
                <span>
                  <strong>{item.description}</strong>
                  <small>
                    {item.category.name} · {formatDate(item.transactionDate)}
                  </small>
                </span>
                <Badge>{item.account.name}</Badge>
                <strong className={item.type === 'INCOME' ? 'money-income' : 'money-expense'}>
                  {signedMoney(item.amount, item.type, item.currencyCode)}
                </strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
