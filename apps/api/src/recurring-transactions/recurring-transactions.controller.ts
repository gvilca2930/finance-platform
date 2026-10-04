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
  CreateRecurringTransactionDto,
  RecurringQueryDto,
  UpdateRecurringTransactionDto,
} from './dto/recurring-transaction.dto';
import { RecurringTransactionsService } from './recurring-transactions.service';

@ApiTags('recurring-transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@Controller('workspaces/:workspaceId/recurring-transactions')
export class RecurringTransactionsController {
  constructor(private readonly service: RecurringTransactionsService) {}
  @Post() @WorkspaceRoles('OWNER', 'ADMIN') create(
    @Param('workspaceId') workspaceId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Body() dto: CreateRecurringTransactionDto,
  ) {
    return this.service.create(workspaceId, member, dto);
  }
  @Get() @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER') list(
    @Param('workspaceId') workspaceId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Query() query: RecurringQueryDto,
  ) {
    return this.service.list(workspaceId, member, query);
  }
  @Get(':id') @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER') get(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
  ) {
    return this.service.get(workspaceId, id, member);
  }
  @Patch(':id') @WorkspaceRoles('OWNER', 'ADMIN') update(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Body() dto: UpdateRecurringTransactionDto,
  ) {
    return this.service.update(workspaceId, id, member, dto);
  }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @WorkspaceRoles('OWNER', 'ADMIN') remove(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
  ) {
    return this.service.remove(workspaceId, id, member);
  }
}
