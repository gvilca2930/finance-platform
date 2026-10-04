import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { WorkspaceMember } from '../generated/prisma/client';
import { CurrentWorkspaceMember } from '../workspaces/decorators/current-workspace-member.decorator';
import { WorkspaceRoles } from '../workspaces/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../workspaces/guards/workspace-access.guard';
import {
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from './dto/transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@Controller('workspaces/:workspaceId/transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}
  @Post() @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF') create(
    @Param('workspaceId') workspaceId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.service.create(workspaceId, member, dto);
  }
  @Get() @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER') list(
    @Param('workspaceId') workspaceId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Query() query: TransactionQueryDto,
  ) {
    return this.service.list(workspaceId, member, query);
  }
  @Get(':transactionId') @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER') get(
    @Param('workspaceId') workspaceId: string,
    @Param('transactionId') transactionId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
  ) {
    return this.service.get(workspaceId, transactionId, member);
  }
  @Patch(':transactionId') @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF') update(
    @Param('workspaceId') workspaceId: string,
    @Param('transactionId') transactionId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.service.update(workspaceId, transactionId, member, dto);
  }
  @Delete(':transactionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('transactionId') transactionId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
  ) {
    return this.service.remove(workspaceId, transactionId, member);
  }
}
