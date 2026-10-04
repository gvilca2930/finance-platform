import { Module } from '@nestjs/common';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { AccountsController, BalancesController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { BalanceService } from './balance.service';

@Module({
  imports: [WorkspacesModule],
  controllers: [AccountsController, BalancesController],
  providers: [AccountsService, BalanceService],
  exports: [AccountsService, BalanceService],
})
export class AccountsModule {}
