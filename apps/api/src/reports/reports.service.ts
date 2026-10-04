import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type WorkspaceMember } from '../generated/prisma/client';
import { BalanceService } from '../accounts/balance.service';
import { resolvePeriod } from '../common/dates';
import { PrismaService } from '../prisma/prisma.service';
import type { CashFlowQueryDto, ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balances: BalanceService,
  ) {}

  async monthlySummary(workspaceId: string, member: WorkspaceMember, query: ReportQueryDto) {
    const workspace = await this.workspace(workspaceId);
    const period = resolvePeriod(workspace.timezone, query.from, query.to);
    const transactions = await this.transactions(workspaceId, member, query, period);
    const totalIncome = this.sum(transactions.filter((item) => item.type === 'INCOME'));
    const totalExpenses = this.sum(transactions.filter((item) => item.type === 'EXPENSE'));
    const budget = await this.budgetSummary(workspaceId, period.from, period.to, transactions);
    const balance = await this.balances.getWorkspaceBalances(workspaceId, member);
    return {
      period: { from: period.fromString, to: period.toString },
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome.minus(totalExpenses),
      totalBalance: balance.totalBalance,
      budgetTotal: budget.total,
      budgetSpent: budget.spent,
      budgetRemaining: budget.remaining,
      transactionCount: transactions.length,
    };
  }

  async incomeExpense(workspaceId: string, member: WorkspaceMember, query: ReportQueryDto) {
    const workspace = await this.workspace(workspaceId);
    const period = resolvePeriod(workspace.timezone, query.from, query.to);
    const transactions = await this.transactions(workspaceId, member, query, period);
    const groups = new Map<string, { income: Prisma.Decimal; expense: Prisma.Decimal }>();
    for (const item of transactions) {
      const key = item.transactionDate.toISOString().slice(0, 7);
      const group = groups.get(key) ?? {
        income: new Prisma.Decimal(0),
        expense: new Prisma.Decimal(0),
      };
      if (item.type === 'INCOME') group.income = group.income.plus(item.amount);
      else group.expense = group.expense.plus(item.amount);
      groups.set(key, group);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({
        period: key,
        income: value.income,
        expense: value.expense,
        net: value.income.minus(value.expense),
      }));
  }

  async categoryBreakdown(workspaceId: string, member: WorkspaceMember, query: ReportQueryDto) {
    const workspace = await this.workspace(workspaceId);
    const period = resolvePeriod(workspace.timezone, query.from, query.to);
    const transactions = await this.transactions(workspaceId, member, query, period);
    const groups = new Map<
      string,
      { categoryId: string; categoryName: string; type: string; amount: Prisma.Decimal }
    >();
    for (const item of transactions) {
      const key = `${item.type}:${item.categoryId}`;
      const group = groups.get(key) ?? {
        categoryId: item.categoryId,
        categoryName: item.category.name,
        type: item.type,
        amount: new Prisma.Decimal(0),
      };
      group.amount = group.amount.plus(item.amount);
      groups.set(key, group);
    }
    const totals = {
      INCOME: this.sum(transactions.filter((item) => item.type === 'INCOME')),
      EXPENSE: this.sum(transactions.filter((item) => item.type === 'EXPENSE')),
    };
    return [...groups.values()].map((group) => ({
      ...group,
      percentage: totals[group.type as 'INCOME' | 'EXPENSE'].isZero()
        ? new Prisma.Decimal(0)
        : group.amount.div(totals[group.type as 'INCOME' | 'EXPENSE']).times(100),
    }));
  }

  async cashFlow(workspaceId: string, member: WorkspaceMember, query: CashFlowQueryDto) {
    const workspace = await this.workspace(workspaceId);
    const period = resolvePeriod(workspace.timezone, query.from, query.to);
    const transactions = await this.transactions(workspaceId, member, query, period);
    const groups = new Map<string, { income: Prisma.Decimal; expense: Prisma.Decimal }>();
    for (const item of transactions) {
      const iso = item.transactionDate.toISOString().slice(0, 10);
      const key =
        query.groupBy === 'day'
          ? iso
          : query.groupBy === 'week'
            ? this.weekKey(item.transactionDate)
            : iso.slice(0, 7);
      const group = groups.get(key) ?? {
        income: new Prisma.Decimal(0),
        expense: new Prisma.Decimal(0),
      };
      if (item.type === 'INCOME') group.income = group.income.plus(item.amount);
      else group.expense = group.expense.plus(item.amount);
      groups.set(key, group);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([periodKey, value]) => ({
        period: periodKey,
        income: value.income,
        expense: value.expense,
        net: value.income.minus(value.expense),
      }));
  }

  async accountBalances(workspaceId: string, member: WorkspaceMember) {
    const result = await this.balances.getWorkspaceBalances(workspaceId, member);
    return result.accounts.map((account) => ({
      accountId: account.accountId,
      accountName: account.name,
      accountType: account.type,
      initialBalance: account.initialBalance,
      currentBalance: account.balance,
      currencyCode: account.currencyCode,
    }));
  }

  async transactions(
    workspaceId: string,
    _member: WorkspaceMember,
    query: ReportQueryDto,
    period: ReturnType<typeof resolvePeriod>,
  ) {
    return this.prisma.transaction.findMany({
      where: {
        workspaceId,
        deletedAt: null,
        transactionDate: { gte: period.from, lte: period.to },
        ...(query.accountId ? { accountId: query.accountId } : {}),
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(query.createdByUserId ? { createdByUserId: query.createdByUserId } : {}),
      },
      include: { category: true, account: true },
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async budgetSummary(
    workspaceId: string,
    from: Date,
    to: Date,
    transactions: Awaited<ReturnType<ReportsService['transactions']>>,
  ) {
    const budgets = await this.prisma.budget.findMany({ where: { workspaceId, deletedAt: null } });
    const relevant = budgets.filter((budget) => {
      const date = new Date(Date.UTC(budget.year, budget.month - 1, 1));
      return date >= new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1)) && date <= to;
    });
    const total = relevant.reduce((sum, budget) => sum.plus(budget.amount), new Prisma.Decimal(0));
    const categoryIds = new Set(relevant.map((budget) => budget.categoryId));
    const spent = this.sum(
      transactions.filter((item) => item.type === 'EXPENSE' && categoryIds.has(item.categoryId)),
    );
    return { total, spent, remaining: total.minus(spent) };
  }

  async workspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  private sum(items: Array<{ amount: Prisma.Decimal }>): Prisma.Decimal {
    return items.reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0));
  }

  private weekKey(date: Date): string {
    const current = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    current.setUTCDate(current.getUTCDate() + 4 - (current.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((current.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
    return `${current.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }
}
