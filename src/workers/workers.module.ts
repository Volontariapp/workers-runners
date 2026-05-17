import { Module } from '@nestjs/common';
import { WorkersUserModule } from './user/user.module.js';

@Module({
  imports: [WorkersUserModule],
})
export class WorkersModule {}
