import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { WorkspaceMember } from '../generated/prisma/client';
import type { Prisma } from '../generated/prisma/client';
import { dateOnly } from '../common/dates';
import { paginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { BalanceService } from '../accounts/balance.service';
import type {
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balances: BalanceService,
  ) {}

  async create(workspaceId: string, member: WorkspaceMember, dto: CreateTransactionDto) {
    const account = await this.balances.assertAccountAccess(workspaceId, dto.accountId, member);
    const category = await this.getCategory(workspaceId, dto.categoryId);
    if (category.type !== dto.type)
      throw new BadRequestException('Category type must match transaction type');
    return this.prisma.transaction.create({
      data: {
        ...dto,
        transactionDate: dateOnly(dto.transactionDate),
        workspaceId,
        createdByUserId: member.userId,
        currencyCode: account.currencyCode,
      },
      include: { account: true, category: true },
    });
  }

  async list(workspaceId: string, _member: WorkspaceMember, query: TransactionQueryDto) {
    const where: Prisma.TransactionWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(query.type ? { type: query.type } : {}),
      ...(query.accountId ? { accountId: query.accountId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.createdByUserId ? { createdByUserId: query.createdByUserId } : {}),
      ...(query.from || query.to
        ? {
            transactionDate: {
              ...(query.from ? { gte: dateOnly(query.from) } : {}),
              ...(query.to ? { lte: dateOnly(query.to) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search, mode: 'insensitive' } },
              { notes: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { account: true, category: true },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { data, pagination: paginationMeta(query.page, query.limit, total) };
  }

  async get(workspaceId: string, transactionId: string, member: WorkspaceMember) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, workspaceId, deletedAt: null },
      include: { account: true, category: true },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    await this.balances.assertAccountAccess(workspaceId, transaction.accountId, member);
    return transaction;
  }

  async update(
    workspaceId: string,
    transactionId: string,
    member: WorkspaceMember,
    dto: UpdateTransactionDto,
  ) {
    const current = await this.get(workspaceId, transactionId, member);
    this.assertCanModify(member, current.createdByUserId);
    const account = await this.balances.assertAccountAccess(
      workspaceId,
      dto.accountId ?? current.accountId,
      member,
    );
    const category = await this.getCategory(workspaceId, dto.categoryId ?? current.categoryId);
    const type = dto.type ?? current.type;
    if (category.type !== type)
      throw new BadRequestException('Category type must match transaction type');
    return this.prisma.transaction.update({
      where: { id: current.id },
      data: {
        ...dto,
        ...(dto.transactionDate ? { transactionDate: dateOnly(dto.transactionDate) } : {}),
        currencyCode: account.currencyCode,
      },
      include: { account: true, category: true },
    });
  }

  async remove(workspaceId: string, transactionId: string, member: WorkspaceMember): Promise<void> {
    const current = await this.get(workspaceId, transactionId, member);
    this.assertCanModify(member, current.createdByUserId);
    await this.prisma.transaction.update({
      where: { id: current.id },
      data: { deletedAt: new Date() },
    });
  }

  private async getCategory(workspaceId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, workspaceId, deletedAt: null, active: true },
    });
    if (!category) throw new BadRequestException('Category must belong to the workspace');
    return category;
  }

  private assertCanModify(member: WorkspaceMember, creatorId: string): void {
    if (member.role === 'STAFF' && creatorId !== member.userId) {
      throw new ForbiddenException('STAFF can only modify their own transactions');
    }
  }
}
