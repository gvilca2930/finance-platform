import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { WorkspaceMember } from '../generated/prisma/client';
import { CurrentWorkspaceMember } from '../workspaces/decorators/current-workspace-member.decorator';
import { WorkspaceRoles } from '../workspaces/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../workspaces/guards/workspace-access.guard';
import { CashFlowQueryDto, ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER')
@Controller('workspaces/:workspaceId/reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Get('monthly-summary') monthly(
    @Param('workspaceId') id: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Query() query: ReportQueryDto,
  ) {
    return this.service.monthlySummary(id, member, query);
  }
  @Get('income-expense') incomeExpense(
    @Param('workspaceId') id: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Query() query: ReportQueryDto,
  ) {
    return this.service.incomeExpense(id, member, query);
  }
  @Get('category-breakdown') categories(
    @Param('workspaceId') id: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Query() query: ReportQueryDto,
  ) {
    return this.service.categoryBreakdown(id, member, query);
  }
  @Get('cash-flow') cashFlow(
    @Param('workspaceId') id: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Query() query: CashFlowQueryDto,
  ) {
    return this.service.cashFlow(id, member, query);
  }
  @Get('account-balances') balances(
    @Param('workspaceId') id: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
  ) {
    return this.service.accountBalances(id, member);
  }
}
