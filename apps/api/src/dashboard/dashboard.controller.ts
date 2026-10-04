import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DateRangeQueryDto } from '../common/dto/date-range-query.dto';
import type { WorkspaceMember } from '../generated/prisma/client';
import { CurrentWorkspaceMember } from '../workspaces/decorators/current-workspace-member.decorator';
import { WorkspaceRoles } from '../workspaces/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../workspaces/guards/workspace-access.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER')
@Controller('workspaces/:workspaceId/dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
  @Get() get(
    @Param('workspaceId') workspaceId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.service.get(workspaceId, member, query);
  }
}
