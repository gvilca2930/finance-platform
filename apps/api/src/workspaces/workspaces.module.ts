import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  AcceptInvitationController,
  BusinessProfileController,
  InvitationsController,
  MembersController,
  WorkspacesController,
} from './workspaces.controller';
import { WorkspaceAccessGuard } from './guards/workspace-access.guard';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [AuthModule],
  controllers: [
    WorkspacesController,
    BusinessProfileController,
    MembersController,
    InvitationsController,
    AcceptInvitationController,
  ],
  providers: [WorkspacesService, WorkspaceAccessGuard],
  exports: [AuthModule, WorkspacesService, WorkspaceAccessGuard],
})
export class WorkspacesModule {}
