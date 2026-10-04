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
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { WorkspaceMember } from '../generated/prisma/client';
import { CurrentWorkspaceMember } from '../workspaces/decorators/current-workspace-member.decorator';
import { WorkspaceRoles } from '../workspaces/decorators/workspace-roles.decorator';
import { AccountAccessDto } from '../workspaces/dto/workspace.dto';
import { WorkspaceAccessGuard } from '../workspaces/guards/workspace-access.guard';
import { AccountsService } from './accounts.service';
import { BalanceService } from './balance.service';
import { CreateAccountDto, UpdateAccountDto } from './dto/account.dto';

@ApiTags('accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@Controller('workspaces/:workspaceId/accounts')
export class AccountsController {
  constructor(
    private readonly service: AccountsService,
    private readonly balances: BalanceService,
  ) {}

  @Post()
  @WorkspaceRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a financial account' })
  create(@Param('workspaceId') workspaceId: string, @Body() dto: CreateAccountDto) {
    return this.service.create(workspaceId, dto);
  }

  @Get()
  @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER')
  list(
    @Param('workspaceId') workspaceId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
  ) {
    return this.service.list(workspaceId, member);
  }

  @Get(':accountId')
  @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER')
  get(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
  ) {
    return this.service.get(workspaceId, accountId, member);
  }

  @Patch(':accountId')
  @WorkspaceRoles('OWNER', 'ADMIN')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.service.update(workspaceId, accountId, dto);
  }

  @Delete(':accountId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @WorkspaceRoles('OWNER', 'ADMIN')
  remove(@Param('workspaceId') workspaceId: string, @Param('accountId') accountId: string) {
    return this.service.remove(workspaceId, accountId);
  }

  @Put(':accountId/access')
  @WorkspaceRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Store account access grants reserved for future restricted accounts' })
  setAccess(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @Body() dto: AccountAccessDto,
  ) {
    return this.service.setAccess(workspaceId, accountId, dto);
  }

  @Get(':accountId/balance')
  @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER')
  balance(
    @Param('workspaceId') workspaceId: string,
    @Param('accountId') accountId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
  ) {
    return this.balances.getAccountBalance(workspaceId, accountId, member);
  }
}

@ApiTags('balances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER')
@Controller('workspaces/:workspaceId/balances')
export class BalancesController {
  constructor(private readonly balances: BalanceService) {}
  @Get()
  get(
    @Param('workspaceId') workspaceId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
  ) {
    return this.balances.getWorkspaceBalances(workspaceId, member);
  }
}
