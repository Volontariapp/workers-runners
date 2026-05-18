import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from '../../database/database.module.js';
import { UserWorker, USER_JOB_HANDLERS } from './user.worker.js';
import { SendWelcomeEmailHandler, ResetPasswordHandler } from './handlers/index.js';
import type { IJobHandler } from '../job-handler.interface.js';

const USER_HANDLERS = [SendWelcomeEmailHandler, ResetPasswordHandler];

@Module({
  imports: [
    BullModule.registerQueue({ name: 'user-queue' }),
    DatabaseModule,
  ],
  providers: [
    ...USER_HANDLERS,
    {
      provide: USER_JOB_HANDLERS,
      useFactory: (...handlers: IJobHandler[]): IJobHandler[] => handlers,
      inject: USER_HANDLERS,
    },
    UserWorker,
  ],
})
export class WorkersUserModule {}
