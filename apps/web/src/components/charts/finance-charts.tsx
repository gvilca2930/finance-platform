'use client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoryAmount, TimeSeries } from '@/types/api';
const colors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
] as const;
const colorAt = (index: number): string => colors[index % colors.length] ?? colors[0];
const money = (value: unknown) =>
  `S/ ${Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
export function IncomeExpenseChart({ data }: { data: TimeSeries[] }) {
  const chart = data.map((item) => ({
    ...item,
    income: Number(item.income),
    expense: Number(item.expense),
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chart} margin={{ left: -12, right: 8 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="period" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v / 1000}k`} />
        <Tooltip formatter={money} cursor={{ fill: 'var(--chart-cursor)' }} />
        <Bar dataKey="income" name="Ingresos" fill="var(--success)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" name="Gastos" fill="var(--danger)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
export function CategoryChart({ data }: { data: CategoryAmount[] }) {
  const top = data
    .slice(0, 6)
    .map((item) => ({ name: item.categoryName, value: Number(item.amount) }));
  return (
    <div className="category-chart">
      <ResponsiveContainer width="100%" height={210}>
        <PieChart>
          <Pie
            data={top}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={82}
            paddingAngle={2}
          >
            {top.map((entry, index) => (
              <Cell key={entry.name} fill={colorAt(index)} />
            ))}
          </Pie>
          <Tooltip formatter={money} />
        </PieChart>
      </ResponsiveContainer>
      <ul>
        {top.map((item, index) => (
          <li key={item.name}>
            <i style={{ background: colorAt(index) }} />
            {item.name}
            <strong>{money(item.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
