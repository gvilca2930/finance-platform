import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { WorkspaceMember } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AccountAccessDto } from '../workspaces/dto/workspace.dto';
import type { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';
import { BalanceService } from './balance.service';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balances: BalanceService,
  ) {}

  async create(workspaceId: string, dto: CreateAccountDto) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    const currencyCode = dto.currencyCode ?? workspace.currencyCode;
    if (currencyCode !== workspace.currencyCode) {
      throw new BadRequestException('Account currency must match workspace currency');
    }
    return this.prisma.financialAccount.create({
      data: { ...dto, workspaceId, currencyCode, initialBalance: dto.initialBalance ?? '0.00' },
    });
  }

  list(workspaceId: string, _member: WorkspaceMember) {
    return this.prisma.financialAccount.findMany({
      where: {
        workspaceId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  get(workspaceId: string, accountId: string, member: WorkspaceMember) {
    return this.balances.assertAccountAccess(workspaceId, accountId, member);
  }

  async update(workspaceId: string, accountId: string, dto: UpdateAccountDto) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id: accountId, workspaceId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Financial account not found');
    return this.prisma.financialAccount.update({ where: { id: account.id }, data: dto });
  }

  async remove(workspaceId: string, accountId: string): Promise<void> {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id: accountId, workspaceId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Financial account not found');
    await this.prisma.financialAccount.update({
      where: { id: account.id },
      data: { deletedAt: new Date(), active: false },
    });
  }

  async setAccess(workspaceId: string, accountId: string, dto: AccountAccessDto) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id: accountId, workspaceId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Financial account not found');
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId, userId: { in: dto.userIds }, status: 'ACTIVE' },
    });
    if (members.length !== new Set(dto.userIds).size) {
      throw new BadRequestException('Every account access user must be an active workspace member');
    }
    await this.prisma.$transaction(async (transaction) => {
      await transaction.financialAccountAccess.deleteMany({ where: { workspaceId, accountId } });
      if (dto.userIds.length) {
        await transaction.financialAccountAccess.createMany({
          data: [...new Set(dto.userIds)].map((userId) => ({ workspaceId, accountId, userId })),
        });
      }
    });
    return this.prisma.financialAccountAccess.findMany({ where: { workspaceId, accountId } });
  }
}
