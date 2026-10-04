export type WorkspaceType = 'PERSONAL' | 'BUSINESS';
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'VIEWER';
export type TransactionType = 'INCOME' | 'EXPENSE';
export type AccountType = 'CASH' | 'BANK' | 'DIGITAL_WALLET' | 'SAVINGS' | 'OTHER';
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface Profile {
  firstName: string;
  middleName?: string | null;
  paternalLastName: string;
  maternalLastName?: string | null;
  phone?: string | null;
  secondaryPhone?: string | null;
  birthDate?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  countryCode: string;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  timezone: string;
  preferredCurrency: string;
  language: string;
}
export interface User {
  id: string;
  email: string;
  status: string;
  profile: Profile;
}
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}
export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  currencyCode: string;
  countryCode: string;
  timezone: string;
  description?: string | null;
  status: string;
  businessProfile?: BusinessProfile | null;
}
export interface WorkspaceMembership {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  status: string;
  joinedAt: string;
  workspace: Workspace;
}
export interface BusinessProfile {
  id?: string;
  workspaceId?: string;
  legalName: string;
  tradeName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  countryCode?: string;
  department?: string | null;
  province?: string | null;
  district?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
}
export interface Member {
  id: string;
  userId: string;
  role: WorkspaceRole;
  status: string;
  joinedAt: string;
  user: { id: string; email: string; status: string; profile: Profile };
}
export interface Invitation {
  id: string;
  email: string;
  role: Exclude<WorkspaceRole, 'OWNER'>;
  status: string;
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
  token?: string;
}
export interface MyInvitation {
  id: string;
  workspace: Pick<Workspace, 'id' | 'name' | 'type'>;
  role: Exclude<WorkspaceRole, 'OWNER'>;
  status: 'PENDING';
  expiresAt: string;
  createdAt: string;
  invitedBy?: { id: string; name: string };
}
export interface Account {
  id: string;
  workspaceId: string;
  name: string;
  type: AccountType;
  currencyCode: string;
  initialBalance: string;
  description?: string | null;
  active: boolean;
}
export interface AccountBalance {
  accountId: string;
  name: string;
  type: AccountType;
  initialBalance: string;
  balance: string;
  currencyCode: string;
}
export interface Balances {
  workspaceId: string;
  currencyCode: string;
  totalBalance: string;
  accounts: AccountBalance[];
}
export interface Category {
  id: string;
  workspaceId: string;
  name: string;
  type: TransactionType;
  parentId?: string | null;
  icon?: string | null;
  active: boolean;
}
export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  createdByUserId: string;
  type: TransactionType;
  amount: string;
  currencyCode: string;
  transactionDate: string;
  description: string;
  notes?: string | null;
  createdAt: string;
  account: Account;
  category: Category;
}
export interface Transfer {
  id: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: string;
  currencyCode: string;
  transactionDate: string;
  description?: string | null;
  createdAt: string;
  sourceAccount?: Account;
  destinationAccount?: Account;
}
export interface Budget {
  id: string;
  categoryId: string;
  amount: string;
  month: number;
  year: number;
  alertPercentage?: string | null;
  category?: Category;
}
export interface BudgetProgress {
  budgetAmount: string;
  spent: string;
  remaining: string;
  percentageUsed: string;
  exceeded: boolean;
}
export interface RecurringTransaction {
  id: string;
  accountId: string;
  categoryId: string;
  type: TransactionType;
  amount: string;
  frequency: Frequency;
  startDate: string;
  nextExecutionDate: string;
  description: string;
  active: boolean;
  account?: Account;
  category?: Category;
}
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}
export interface Dashboard {
  workspace: Pick<Workspace, 'id' | 'name' | 'type' | 'timezone'>;
  currencyCode: string;
  period: { from: string; to: string };
  totalBalance: string;
  totalIncome: string;
  totalExpenses: string;
  netCashFlow: string;
  transactionCount: number;
  budget: { total: string; spent: string; remaining: string };
  expensesByCategory: CategoryAmount[];
  incomeByCategory: CategoryAmount[];
  accountBalances: AccountBalance[];
  recentTransactions: Transaction[];
}
export interface CategoryAmount {
  categoryId: string;
  categoryName: string;
  type?: TransactionType;
  amount: string;
  percentage?: string;
}
export interface TimeSeries {
  period: string;
  income: string;
  expense: string;
  net: string;
}
export interface MonthlySummary {
  period: { from: string; to: string };
  totalIncome: string;
  totalExpenses: string;
  netCashFlow: string;
  totalBalance: string;
  budgetTotal: string;
  budgetSpent: string;
  budgetRemaining: string;
  transactionCount: number;
}
