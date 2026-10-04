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
import { WorkspaceRoles } from '../workspaces/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../workspaces/guards/workspace-access.guard';
import { BudgetsService } from './budgets.service';
import { BudgetQueryDto, CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';

@ApiTags('budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@Controller('workspaces/:workspaceId/budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}
  @Post() @WorkspaceRoles('OWNER', 'ADMIN') create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.service.create(workspaceId, dto);
  }
  @Get() @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER') list(
    @Param('workspaceId') workspaceId: string,
    @Query() query: BudgetQueryDto,
  ) {
    return this.service.list(workspaceId, query);
  }
  @Get(':budgetId') @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER') get(
    @Param('workspaceId') workspaceId: string,
    @Param('budgetId') id: string,
  ) {
    return this.service.get(workspaceId, id);
  }
  @Get(':budgetId/progress') @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER') progress(
    @Param('workspaceId') workspaceId: string,
    @Param('budgetId') id: string,
  ) {
    return this.service.progress(workspaceId, id);
  }
  @Patch(':budgetId') @WorkspaceRoles('OWNER', 'ADMIN') update(
    @Param('workspaceId') workspaceId: string,
    @Param('budgetId') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.service.update(workspaceId, id, dto);
  }
  @Delete(':budgetId') @HttpCode(HttpStatus.NO_CONTENT) @WorkspaceRoles('OWNER', 'ADMIN') remove(
    @Param('workspaceId') workspaceId: string,
    @Param('budgetId') id: string,
  ) {
    return this.service.remove(workspaceId, id);
  }
}
