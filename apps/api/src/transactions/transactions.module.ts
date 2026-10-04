import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  imports: [WorkspacesModule, AccountsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
