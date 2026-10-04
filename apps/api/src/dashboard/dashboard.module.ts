import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { ReportsModule } from '../reports/reports.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [WorkspacesModule, AccountsModule, ReportsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
