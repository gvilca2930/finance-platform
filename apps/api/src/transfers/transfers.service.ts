import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, WorkspaceMember } from '../generated/prisma/client';
import { BalanceService } from '../accounts/balance.service';
import { dateOnly } from '../common/dates';
import { paginationMeta } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTransferDto, TransferQueryDto, UpdateTransferDto } from './dto/transfer.dto';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balances: BalanceService,
  ) {}

  async create(workspaceId: string, member: WorkspaceMember, dto: CreateTransferDto) {
    const { source } = await this.validateAccounts(
      workspaceId,
      member,
      dto.sourceAccountId,
      dto.destinationAccountId,
    );
    return this.prisma.transfer.create({
      data: {
        ...dto,
        transactionDate: dateOnly(dto.transactionDate),
        workspaceId,
        createdByUserId: member.userId,
        currencyCode: source.currencyCode,
      },
      include: { sourceAccount: true, destinationAccount: true },
    });
  }

  async list(workspaceId: string, _member: WorkspaceMember, query: TransferQueryDto) {
    const where: Prisma.TransferWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(query.accountId
        ? { OR: [{ sourceAccountId: query.accountId }, { destinationAccountId: query.accountId }] }
        : {}),
      ...(query.from || query.to
        ? {
            transactionDate: {
              ...(query.from ? { gte: dateOnly(query.from) } : {}),
              ...(query.to ? { lte: dateOnly(query.to) } : {}),
            },
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.transfer.findMany({
        where,
        include: { sourceAccount: true, destinationAccount: true },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.transfer.count({ where }),
    ]);
    return { data, pagination: paginationMeta(query.page, query.limit, total) };
  }

  async get(workspaceId: string, transferId: string, member: WorkspaceMember) {
    const transfer = await this.prisma.transfer.findFirst({
      where: { id: transferId, workspaceId, deletedAt: null },
      include: { sourceAccount: true, destinationAccount: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    await Promise.all([
      this.balances.assertAccountAccess(workspaceId, transfer.sourceAccountId, member),
      this.balances.assertAccountAccess(workspaceId, transfer.destinationAccountId, member),
    ]);
    return transfer;
  }

  async update(
    workspaceId: string,
    transferId: string,
    member: WorkspaceMember,
    dto: UpdateTransferDto,
  ) {
    const current = await this.get(workspaceId, transferId, member);
    this.assertCanModify(member, current.createdByUserId);
    const { source } = await this.validateAccounts(
      workspaceId,
      member,
      dto.sourceAccountId ?? current.sourceAccountId,
      dto.destinationAccountId ?? current.destinationAccountId,
    );
    return this.prisma.transfer.update({
      where: { id: current.id },
      data: {
        ...dto,
        ...(dto.transactionDate ? { transactionDate: dateOnly(dto.transactionDate) } : {}),
        currencyCode: source.currencyCode,
      },
      include: { sourceAccount: true, destinationAccount: true },
    });
  }

  async remove(workspaceId: string, transferId: string, member: WorkspaceMember): Promise<void> {
    const current = await this.get(workspaceId, transferId, member);
    this.assertCanModify(member, current.createdByUserId);
    await this.prisma.transfer.update({
      where: { id: current.id },
      data: { deletedAt: new Date() },
    });
  }

  private async validateAccounts(
    workspaceId: string,
    member: WorkspaceMember,
    sourceId: string,
    destinationId: string,
  ) {
    if (sourceId === destinationId)
      throw new BadRequestException('Source and destination accounts must differ');
    const [source, destination] = await Promise.all([
      this.balances.assertAccountAccess(workspaceId, sourceId, member),
      this.balances.assertAccountAccess(workspaceId, destinationId, member),
    ]);
    if (source.currencyCode !== destination.currencyCode)
      throw new BadRequestException('Transfer accounts must use the same currency');
    return { source, destination };
  }

  private assertCanModify(member: WorkspaceMember, creatorId: string): void {
    if (member.role === 'STAFF' && creatorId !== member.userId)
      throw new ForbiddenException('STAFF can only modify their own transfers');
  }
}
