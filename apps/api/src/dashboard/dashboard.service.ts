import { Injectable } from '@nestjs/common';
import { Prisma, type WorkspaceMember } from '../generated/prisma/client';
import { BalanceService } from '../accounts/balance.service';
import { resolvePeriod } from '../common/dates';
import { ReportsService } from '../reports/reports.service';
import type { DateRangeQueryDto } from '../common/dto/date-range-query.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly reports: ReportsService,
    private readonly balances: BalanceService,
  ) {}

  async get(workspaceId: string, member: WorkspaceMember, query: DateRangeQueryDto) {
    const workspace = await this.reports.workspace(workspaceId);
    const period = resolvePeriod(workspace.timezone, query.from, query.to);
    const reportQuery = { ...query };
    const [transactions, balance] = await Promise.all([
      this.reports.transactions(workspaceId, member, reportQuery, period),
      this.balances.getWorkspaceBalances(workspaceId, member),
    ]);
    const income = transactions.filter((item) => item.type === 'INCOME');
    const expenses = transactions.filter((item) => item.type === 'EXPENSE');
    const totalIncome = income.reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0));
    const totalExpenses = expenses.reduce(
      (sum, item) => sum.plus(item.amount),
      new Prisma.Decimal(0),
    );
    const budget = await this.reports.budgetSummary(
      workspaceId,
      period.from,
      period.to,
      transactions,
    );
    const categoryGroups = (items: typeof transactions) => {
      const groups = new Map<
        string,
        { categoryId: string; categoryName: string; amount: Prisma.Decimal }
      >();
      for (const item of items) {
        const group = groups.get(item.categoryId) ?? {
          categoryId: item.categoryId,
          categoryName: item.category.name,
          amount: new Prisma.Decimal(0),
        };
        group.amount = group.amount.plus(item.amount);
        groups.set(item.categoryId, group);
      }
      return [...groups.values()].sort((a, b) => b.amount.comparedTo(a.amount));
    };
    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        type: workspace.type,
        timezone: workspace.timezone,
      },
      currencyCode: workspace.currencyCode,
      period: { from: period.fromString, to: period.toString },
      totalBalance: balance.totalBalance,
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome.minus(totalExpenses),
      transactionCount: transactions.length,
      budget,
      expensesByCategory: categoryGroups(expenses),
      incomeByCategory: categoryGroups(income),
      accountBalances: balance.accounts,
      recentTransactions: transactions.slice(0, 10),
    };
  }
}
