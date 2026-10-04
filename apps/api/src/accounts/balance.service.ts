import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { WorkspaceMember } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BalanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccountBalance(workspaceId: string, accountId: string, member: WorkspaceMember) {
    const balances = await this.getWorkspaceBalances(workspaceId, member);
    const account = balances.accounts.find((item) => item.accountId === accountId);
    if (!account) throw new NotFoundException('Financial account not found');
    return { workspaceId, ...account };
  }

  async getWorkspaceBalances(workspaceId: string, _member: WorkspaceMember) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    const accounts = await this.prisma.financialAccount.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const ids = accounts.map((account) => account.id);
    const [transactions, transfers] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { workspaceId, accountId: { in: ids }, deletedAt: null },
        select: { accountId: true, type: true, amount: true },
      }),
      this.prisma.transfer.findMany({
        where: {
          workspaceId,
          deletedAt: null,
          OR: [{ sourceAccountId: { in: ids } }, { destinationAccountId: { in: ids } }],
        },
        select: { sourceAccountId: true, destinationAccountId: true, amount: true },
      }),
    ]);

    const values = new Map(
      accounts.map((account) => [account.id, new Prisma.Decimal(account.initialBalance)]),
    );
    for (const transaction of transactions) {
      const current = values.get(transaction.accountId) ?? new Prisma.Decimal(0);
      values.set(
        transaction.accountId,
        transaction.type === 'INCOME'
          ? current.plus(transaction.amount)
          : current.minus(transaction.amount),
      );
    }
    for (const transfer of transfers) {
      if (values.has(transfer.sourceAccountId)) {
        values.set(
          transfer.sourceAccountId,
          values.get(transfer.sourceAccountId)!.minus(transfer.amount),
        );
      }
      if (values.has(transfer.destinationAccountId)) {
        values.set(
          transfer.destinationAccountId,
          values.get(transfer.destinationAccountId)!.plus(transfer.amount),
        );
      }
    }
    const result = accounts.map((account) => ({
      accountId: account.id,
      name: account.name,
      type: account.type,
      initialBalance: account.initialBalance,
      balance: values.get(account.id) ?? new Prisma.Decimal(0),
      currencyCode: account.currencyCode,
    }));
    return {
      workspaceId,
      currencyCode: workspace.currencyCode,
      totalBalance: result.reduce((sum, item) => sum.plus(item.balance), new Prisma.Decimal(0)),
      accounts: result,
    };
  }

  async assertAccountAccess(workspaceId: string, accountId: string, _member: WorkspaceMember) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id: accountId, workspaceId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Financial account not found');
    return account;
  }
}
