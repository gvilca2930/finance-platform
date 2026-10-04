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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/auth-user';
import { CurrentWorkspaceMember } from './decorators/current-workspace-member.decorator';
import { WorkspaceRoles } from './decorators/workspace-roles.decorator';
import {
  AcceptInvitationDto,
  BusinessProfileDto,
  CreateInvitationDto,
  CreateWorkspaceDto,
  MyInvitationResponseDto,
  UpdateBusinessProfileDto,
  UpdateMemberDto,
  UpdateWorkspaceDto,
} from './dto/workspace.dto';
import { WorkspaceAccessGuard } from './guards/workspace-access.guard';
import type { WorkspaceMember } from '../generated/prisma/client';
import { WorkspacesService } from './workspaces.service';

@ApiTags('workspaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly service: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a workspace, OWNER membership, and default categories' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateWorkspaceDto) {
    return this.service.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List workspaces available to the current user' })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.userId);
  }

  @Get(':workspaceId')
  @UseGuards(WorkspaceAccessGuard)
  get(@Param('workspaceId') id: string) {
    return this.service.get(id);
  }

  @Patch(':workspaceId')
  @UseGuards(WorkspaceAccessGuard)
  @WorkspaceRoles('OWNER')
  update(@Param('workspaceId') id: string, @Body() dto: UpdateWorkspaceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':workspaceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(WorkspaceAccessGuard)
  @WorkspaceRoles('OWNER')
  remove(@Param('workspaceId') id: string) {
    return this.service.remove(id);
  }
}

@ApiTags('business-profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@WorkspaceRoles('OWNER', 'ADMIN')
@Controller('workspaces/:workspaceId/business-profile')
export class BusinessProfileController {
  constructor(private readonly service: WorkspacesService) {}
  @Get() get(@Param('workspaceId') id: string) {
    return this.service.getBusinessProfile(id);
  }
  @Put() put(@Param('workspaceId') id: string, @Body() dto: BusinessProfileDto) {
    return this.service.putBusinessProfile(id, dto);
  }
  @Patch() patch(@Param('workspaceId') id: string, @Body() dto: UpdateBusinessProfileDto) {
    return this.service.patchBusinessProfile(id, dto);
  }
}

@ApiTags('workspace-members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@WorkspaceRoles('OWNER', 'ADMIN')
@Controller('workspaces/:workspaceId/members')
export class MembersController {
  constructor(private readonly service: WorkspacesService) {}
  @Get() list(@Param('workspaceId') id: string) {
    return this.service.listMembers(id);
  }
  @Get(':memberId') get(@Param('workspaceId') id: string, @Param('memberId') memberId: string) {
    return this.service.getMember(id, memberId);
  }
  @Patch(':memberId') update(
    @CurrentWorkspaceMember() actor: WorkspaceMember,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    return this.service.updateMember(actor, memberId, dto);
  }
  @Delete(':memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentWorkspaceMember() actor: WorkspaceMember, @Param('memberId') memberId: string) {
    return this.service.removeMember(actor, memberId);
  }
}

@ApiTags('workspace-invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@WorkspaceRoles('OWNER', 'ADMIN')
@Controller('workspaces/:workspaceId/invitations')
export class InvitationsController {
  constructor(private readonly service: WorkspacesService) {}
  @Post() create(
    @CurrentWorkspaceMember() actor: WorkspaceMember,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.service.createInvitation(actor, dto);
  }
  @Get() list(@Param('workspaceId') id: string) {
    return this.service.listInvitations(id);
  }
  @Delete(':invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('workspaceId') id: string, @Param('invitationId') invitationId: string) {
    return this.service.cancelInvitation(id, invitationId);
  }
}

@ApiTags('workspace-invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspace-invitations')
export class AcceptInvitationController {
  constructor(private readonly service: WorkspacesService) {}
  @Get('me')
  @ApiOperation({ summary: 'List pending invitations for the authenticated user email' })
  @ApiOkResponse({ type: MyInvitationResponseDto, isArray: true })
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listMyInvitations(user.email);
  }

  @Post(':invitationId/accept')
  @ApiOperation({ summary: 'Accept an invitation belonging to the authenticated user' })
  @ApiCreatedResponse({ description: 'Workspace membership created' })
  acceptMine(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string) {
    return this.service.acceptMyInvitation(user.userId, user.email, invitationId);
  }

  @Post(':invitationId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject an invitation belonging to the authenticated user' })
  @ApiOkResponse({ type: MyInvitationResponseDto })
  rejectMine(@CurrentUser() user: AuthenticatedUser, @Param('invitationId') invitationId: string) {
    return this.service.rejectMyInvitation(user.email, invitationId);
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept an invitation using its one-time token' })
  accept(@CurrentUser() user: AuthenticatedUser, @Body() dto: AcceptInvitationDto) {
    return this.service.acceptInvitation(user.userId, user.email, dto);
  }
}
