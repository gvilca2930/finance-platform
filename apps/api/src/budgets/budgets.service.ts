import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { paginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import type { BudgetQueryDto, CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateBudgetDto) {
    await this.validate(workspaceId, dto.categoryId, dto.month, dto.year);
    return this.prisma.budget.create({
      data: { ...dto, workspaceId },
      include: { category: true },
    });
  }

  async list(workspaceId: string, query: BudgetQueryDto) {
    const where = {
      workspaceId,
      deletedAt: null,
      ...(query.month ? { month: query.month } : {}),
      ...(query.year ? { year: query.year } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.budget.findMany({
        where,
        include: { category: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.budget.count({ where }),
    ]);
    return { data, pagination: paginationMeta(query.page, query.limit, total) };
  }

  async get(workspaceId: string, budgetId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, workspaceId, deletedAt: null },
      include: { category: true },
    });
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  async update(workspaceId: string, budgetId: string, dto: UpdateBudgetDto) {
    const current = await this.get(workspaceId, budgetId);
    await this.validate(
      workspaceId,
      dto.categoryId ?? current.categoryId,
      dto.month ?? current.month,
      dto.year ?? current.year,
      current.id,
    );
    return this.prisma.budget.update({
      where: { id: current.id },
      data: dto,
      include: { category: true },
    });
  }

  async remove(workspaceId: string, budgetId: string): Promise<void> {
    const budget = await this.get(workspaceId, budgetId);
    await this.prisma.budget.update({ where: { id: budget.id }, data: { deletedAt: new Date() } });
  }

  async progress(workspaceId: string, budgetId: string) {
    const budget = await this.get(workspaceId, budgetId);
    const from = new Date(Date.UTC(budget.year, budget.month - 1, 1));
    const to = new Date(Date.UTC(budget.year, budget.month, 0));
    const aggregate = await this.prisma.transaction.aggregate({
      where: {
        workspaceId,
        categoryId: budget.categoryId,
        type: 'EXPENSE',
        deletedAt: null,
        transactionDate: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });
    const spent = aggregate._sum.amount ?? new Prisma.Decimal(0);
    const remaining = budget.amount.minus(spent);
    const percentageUsed = spent.div(budget.amount).times(100);
    return {
      budgetId: budget.id,
      budgetAmount: budget.amount,
      spent,
      remaining,
      percentageUsed,
      exceeded: spent.gt(budget.amount),
    };
  }

  private async validate(
    workspaceId: string,
    categoryId: string,
    month: number,
    year: number,
    excludeId?: string,
  ) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, workspaceId, deletedAt: null, type: 'EXPENSE' },
    });
    if (!category)
      throw new BadRequestException(
        'Budget category must be an active EXPENSE category in the workspace',
      );
    const duplicate = await this.prisma.budget.findFirst({
      where: {
        workspaceId,
        categoryId,
        month,
        year,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (duplicate)
      throw new ConflictException('An active budget already exists for category, month, and year');
  }
}
