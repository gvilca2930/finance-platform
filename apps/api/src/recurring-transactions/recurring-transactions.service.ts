import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { WorkspaceMember } from '../generated/prisma/client';
import { BalanceService } from '../accounts/balance.service';
import { dateOnly } from '../common/dates';
import { paginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateRecurringTransactionDto,
  RecurringQueryDto,
  UpdateRecurringTransactionDto,
} from './dto/recurring-transaction.dto';

@Injectable()
export class RecurringTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balances: BalanceService,
  ) {}

  async create(workspaceId: string, member: WorkspaceMember, dto: CreateRecurringTransactionDto) {
    await this.validate(
      workspaceId,
      member,
      dto.accountId,
      dto.categoryId,
      dto.type,
      dto.startDate,
      dto.nextExecutionDate,
    );
    return this.prisma.recurringTransaction.create({
      data: {
        ...dto,
        startDate: dateOnly(dto.startDate),
        nextExecutionDate: dateOnly(dto.nextExecutionDate),
        workspaceId,
        createdByUserId: member.userId,
      },
    });
  }

  async list(workspaceId: string, _member: WorkspaceMember, query: RecurringQueryDto) {
    const where = {
      workspaceId,
      ...(query.active === undefined ? {} : { active: query.active }),
    };
    const [data, total] = await Promise.all([
      this.prisma.recurringTransaction.findMany({
        where,
        include: { account: true, category: true },
        orderBy: { nextExecutionDate: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.recurringTransaction.count({ where }),
    ]);
    return { data, pagination: paginationMeta(query.page, query.limit, total) };
  }

  async get(workspaceId: string, id: string, member: WorkspaceMember) {
    const recurring = await this.prisma.recurringTransaction.findFirst({
      where: { id, workspaceId },
      include: { account: true, category: true },
    });
    if (!recurring) throw new NotFoundException('Recurring transaction not found');
    await this.balances.assertAccountAccess(workspaceId, recurring.accountId, member);
    return recurring;
  }

  async update(
    workspaceId: string,
    id: string,
    member: WorkspaceMember,
    dto: UpdateRecurringTransactionDto,
  ) {
    const current = await this.get(workspaceId, id, member);
    const start = dto.startDate ?? current.startDate.toISOString().slice(0, 10);
    const next = dto.nextExecutionDate ?? current.nextExecutionDate.toISOString().slice(0, 10);
    await this.validate(
      workspaceId,
      member,
      dto.accountId ?? current.accountId,
      dto.categoryId ?? current.categoryId,
      dto.type ?? current.type,
      start,
      next,
    );
    return this.prisma.recurringTransaction.update({
      where: { id: current.id },
      data: {
        ...dto,
        ...(dto.startDate ? { startDate: dateOnly(dto.startDate) } : {}),
        ...(dto.nextExecutionDate ? { nextExecutionDate: dateOnly(dto.nextExecutionDate) } : {}),
      },
    });
  }

  async remove(workspaceId: string, id: string, member: WorkspaceMember): Promise<void> {
    const current = await this.get(workspaceId, id, member);
    await this.prisma.recurringTransaction.update({
      where: { id: current.id },
      data: { active: false },
    });
  }

  private async validate(
    workspaceId: string,
    member: WorkspaceMember,
    accountId: string,
    categoryId: string,
    type: string,
    start: string,
    next: string,
  ) {
    await this.balances.assertAccountAccess(workspaceId, accountId, member);
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, workspaceId, deletedAt: null, active: true },
    });
    if (!category || category.type !== type)
      throw new BadRequestException(
        'Category must belong to workspace and match recurring transaction type',
      );
    if (dateOnly(next) < dateOnly(start))
      throw new BadRequestException('nextExecutionDate must not precede startDate');
  }
}
