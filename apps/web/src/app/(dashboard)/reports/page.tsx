'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CategoryChart, IncomeExpenseChart } from '@/components/charts/finance-charts';
import { Field, Input, PageHeader, Skeleton } from '@/components/ui';
import { financeApi } from '@/lib/api/finance';
import { formatMoney } from '@/lib/money';
import { useWorkspace } from '@/providers/app-providers';
export default function ReportsPage() {
  const { current } = useWorkspace();
  const id = current?.workspaceId ?? '';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tab, setTab] = useState<'summary' | 'flow' | 'categories' | 'accounts'>('summary');
  const summary = useQuery({
    queryKey: ['report-summary', id, from, to],
    queryFn: () => financeApi.summary(id, from || undefined, to || undefined),
    enabled: Boolean(id),
  });
  const series = useQuery({
    queryKey: ['report-series', id, from, to],
    queryFn: () => financeApi.incomeExpense(id, from || undefined, to || undefined),
    enabled: Boolean(id),
  });
  const breakdown = useQuery({
    queryKey: ['report-breakdown', id, from, to],
    queryFn: () => financeApi.breakdown(id, from || undefined, to || undefined),
    enabled: Boolean(id),
  });
  const balances = useQuery({
    queryKey: ['balances', id],
    queryFn: () => financeApi.balances(id),
    enabled: Boolean(id),
  });
  return (
    <>
      <PageHeader
        title="Reportes"
        description="Analiza resultados, flujo y composición financiera."
      />
      <section className="report-filters">
        <Field label="Desde">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Hasta">
          <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </section>
      <nav className="tabs">
        <button className={tab === 'summary' ? 'active' : ''} onClick={() => setTab('summary')}>
          Resumen
        </button>
        <button className={tab === 'flow' ? 'active' : ''} onClick={() => setTab('flow')}>
          Ingresos y gastos
        </button>
        <button
          className={tab === 'categories' ? 'active' : ''}
          onClick={() => setTab('categories')}
        >
          Categorías
        </button>
        <button className={tab === 'accounts' ? 'active' : ''} onClick={() => setTab('accounts')}>
          Saldos
        </button>
      </nav>
      {summary.isLoading ? (
        <Skeleton lines={6} />
      ) : tab === 'summary' && summary.data ? (
        <>
          <section className="stats-strip">
            <div>
              <span>Saldo total</span>
              <strong>{formatMoney(summary.data.totalBalance)}</strong>
            </div>
            <div>
              <span>Ingresos</span>
              <strong className="money-income">{formatMoney(summary.data.totalIncome)}</strong>
            </div>
            <div>
              <span>Gastos</span>
              <strong className="money-expense">{formatMoney(summary.data.totalExpenses)}</strong>
            </div>
            <div>
              <span>Flujo neto</span>
              <strong>{formatMoney(summary.data.netCashFlow)}</strong>
            </div>
          </section>
          <section className="panel">
            <header>
              <div>
                <h2>Evolución mensual</h2>
                <p>Ingresos y gastos sin incluir transferencias internas</p>
              </div>
            </header>
            <IncomeExpenseChart data={series.data ?? []} />
          </section>
        </>
      ) : null}
      {tab === 'flow' && (
        <section className="panel">
          <header>
            <div>
              <h2>Ingresos vs. gastos</h2>
              <p>Serie preparada para comparar periodos</p>
            </div>
          </header>
          <IncomeExpenseChart data={series.data ?? []} />
        </section>
      )}
      {tab === 'categories' && (
        <div className="two-columns">
          <section className="panel">
            <header>
              <div>
                <h2>Gastos por categoría</h2>
                <p>Principales destinos del dinero</p>
              </div>
            </header>
            <CategoryChart data={(breakdown.data ?? []).filter((x) => x.type === 'EXPENSE')} />
          </section>
          <section className="panel">
            <header>
              <div>
                <h2>Ingresos por categoría</h2>
                <p>Principales fuentes de dinero</p>
              </div>
            </header>
            <CategoryChart data={(breakdown.data ?? []).filter((x) => x.type === 'INCOME')} />
          </section>
        </div>
      )}
      {tab === 'accounts' && (
        <section className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Cuenta</th>
                <th>Tipo</th>
                <th>Saldo inicial</th>
                <th className="amount-cell">Saldo actual</th>
              </tr>
            </thead>
            <tbody>
              {balances.data?.accounts.map((a) => (
                <tr key={a.accountId}>
                  <td>
                    <strong>{a.name}</strong>
                  </td>
                  <td>{a.type}</td>
                  <td>{formatMoney(a.initialBalance, a.currencyCode)}</td>
                  <td className="amount-cell">
                    <strong>{formatMoney(a.balance, a.currencyCode)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
