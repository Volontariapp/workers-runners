import { Module } from '@nestjs/common';
import { WorkersUserModule } from './user/user.module';

@Module({
  imports: [WorkersUserModule],
})
export class WorkersModule {}
