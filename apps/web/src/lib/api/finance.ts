import { api, queryString } from './client';
import type {
  Account,
  Balances,
  Budget,
  BudgetProgress,
  Category,
  Dashboard,
  MonthlySummary,
  Paginated,
  RecurringTransaction,
  TimeSeries,
  Transaction,
  Transfer,
  CategoryAmount,
  Member,
} from '@/types/api';
const base = (w: string) => `/workspaces/${w}`;
export const financeApi = {
  accounts: (w: string) => api<Account[]>(`${base(w)}/accounts`),
  balances: (w: string) => api<Balances>(`${base(w)}/balances`),
  saveAccount: (w: string, body: Partial<Account>, id?: string) =>
    api<Account>(`${base(w)}/accounts${id ? `/${id}` : ''}`, {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }),
  removeAccount: (w: string, id: string) =>
    api<void>(`${base(w)}/accounts/${id}`, { method: 'DELETE' }),
  categories: (w: string) => api<Category[]>(`${base(w)}/categories`),
  saveCategory: (w: string, body: Partial<Category>, id?: string) =>
    api<Category>(`${base(w)}/categories${id ? `/${id}` : ''}`, {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }),
  removeCategory: (w: string, id: string) =>
    api<void>(`${base(w)}/categories/${id}`, { method: 'DELETE' }),
  transactions: (w: string, filters: Record<string, string | number | undefined>) =>
    api<Paginated<Transaction>>(`${base(w)}/transactions${queryString(filters)}`),
  saveTransaction: (w: string, body: Partial<Transaction>, id?: string) =>
    api<Transaction>(`${base(w)}/transactions${id ? `/${id}` : ''}`, {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }),
  removeTransaction: (w: string, id: string) =>
    api<void>(`${base(w)}/transactions/${id}`, { method: 'DELETE' }),
  transfers: (w: string, filters: Record<string, string | number | undefined>) =>
    api<Paginated<Transfer>>(`${base(w)}/transfers${queryString(filters)}`),
  saveTransfer: (w: string, body: Partial<Transfer>, id?: string) =>
    api<Transfer>(`${base(w)}/transfers${id ? `/${id}` : ''}`, {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }),
  removeTransfer: (w: string, id: string) =>
    api<void>(`${base(w)}/transfers/${id}`, { method: 'DELETE' }),
  budgets: (w: string, filters: Record<string, number>) =>
    api<Paginated<Budget>>(`${base(w)}/budgets${queryString(filters)}`),
  budgetProgress: (w: string, id: string) =>
    api<BudgetProgress>(`${base(w)}/budgets/${id}/progress`),
  saveBudget: (w: string, body: Partial<Budget>, id?: string) =>
    api<Budget>(`${base(w)}/budgets${id ? `/${id}` : ''}`, {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }),
  removeBudget: (w: string, id: string) =>
    api<void>(`${base(w)}/budgets/${id}`, { method: 'DELETE' }),
  recurring: (w: string, page = 1) =>
    api<Paginated<RecurringTransaction>>(`${base(w)}/recurring-transactions?page=${page}&limit=20`),
  saveRecurring: (w: string, body: Partial<RecurringTransaction>, id?: string) =>
    api<RecurringTransaction>(`${base(w)}/recurring-transactions${id ? `/${id}` : ''}`, {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(body),
    }),
  removeRecurring: (w: string, id: string) =>
    api<void>(`${base(w)}/recurring-transactions/${id}`, { method: 'DELETE' }),
  dashboard: (w: string, from?: string, to?: string) =>
    api<Dashboard>(`${base(w)}/dashboard${queryString({ from, to })}`),
  summary: (w: string, from?: string, to?: string) =>
    api<MonthlySummary>(`${base(w)}/reports/monthly-summary${queryString({ from, to })}`),
  incomeExpense: (w: string, from?: string, to?: string) =>
    api<TimeSeries[]>(`${base(w)}/reports/income-expense${queryString({ from, to })}`),
  cashFlow: (w: string, from?: string, to?: string) =>
    api<TimeSeries[]>(`${base(w)}/reports/cash-flow${queryString({ from, to, groupBy: 'month' })}`),
  breakdown: (w: string, from?: string, to?: string) =>
    api<CategoryAmount[]>(`${base(w)}/reports/category-breakdown${queryString({ from, to })}`),
  members: (w: string) => api<Member[]>(`${base(w)}/members`),
};
