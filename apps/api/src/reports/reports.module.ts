import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [WorkspacesModule, AccountsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
