export const DEFAULT_COUNTRY_CODE = 'PE' as const;
export const DEFAULT_CURRENCY_CODE = 'PEN' as const;
export const DEFAULT_LANGUAGE = 'es' as const;
export const DEFAULT_TIMEZONE = 'America/Lima' as const;

export enum WorkspaceType {
  PERSONAL = 'PERSONAL',
  BUSINESS = 'BUSINESS',
}

export enum WorkspaceRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  VIEWER = 'VIEWER',
}

export enum FinancialAccountType {
  CASH = 'CASH',
  BANK = 'BANK',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  SAVINGS = 'SAVINGS',
  OTHER = 'OTHER',
}

export enum CategoryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Monetary values cross API boundaries as decimal strings, never IEEE-754 numbers. */
export type MoneyAmount = string;
