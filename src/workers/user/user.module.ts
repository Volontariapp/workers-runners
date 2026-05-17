import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../database/database.module';
import { UserWorker } from './user.worker';
import { UserService } from './user.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'user-queue',
    }),
    DatabaseModule,
  ],
  providers: [UserWorker, UserService],
})
export class WorkersUserModule {}
