import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { RecurringTransactionsController } from './recurring-transactions.controller';
import { RecurringTransactionsService } from './recurring-transactions.service';

@Module({
  imports: [WorkspacesModule, AccountsModule],
  controllers: [RecurringTransactionsController],
  providers: [RecurringTransactionsService],
})
export class RecurringTransactionsModule {}
