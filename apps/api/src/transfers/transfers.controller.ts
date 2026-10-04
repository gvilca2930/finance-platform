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
import { CreateTransferDto, TransferQueryDto, UpdateTransferDto } from './dto/transfer.dto';
import { TransfersService } from './transfers.service';

@ApiTags('transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@Controller('workspaces/:workspaceId/transfers')
export class TransfersController {
  constructor(private readonly service: TransfersService) {}
  @Post() @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF') create(
    @Param('workspaceId') workspaceId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Body() dto: CreateTransferDto,
  ) {
    return this.service.create(workspaceId, member, dto);
  }
  @Get() @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER') list(
    @Param('workspaceId') workspaceId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Query() query: TransferQueryDto,
  ) {
    return this.service.list(workspaceId, member, query);
  }
  @Get(':transferId') @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER') get(
    @Param('workspaceId') workspaceId: string,
    @Param('transferId') transferId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
  ) {
    return this.service.get(workspaceId, transferId, member);
  }
  @Patch(':transferId') @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF') update(
    @Param('workspaceId') workspaceId: string,
    @Param('transferId') transferId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
    @Body() dto: UpdateTransferDto,
  ) {
    return this.service.update(workspaceId, transferId, member, dto);
  }
  @Delete(':transferId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF')
  remove(
    @Param('workspaceId') workspaceId: string,
    @Param('transferId') transferId: string,
    @CurrentWorkspaceMember() member: WorkspaceMember,
  ) {
    return this.service.remove(workspaceId, transferId, member);
  }
}
