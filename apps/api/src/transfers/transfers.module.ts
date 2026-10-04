import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  imports: [WorkspacesModule, AccountsModule],
  controllers: [TransfersController],
  providers: [TransfersService],
})
export class TransfersModule {}
