import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from './database/database.module';
import { WorkersModule } from './workers/workers.module';
import { getBullConfig } from './config/bull.config';

@Module({
  imports: [
    BullModule.forRoot(getBullConfig()),
    DatabaseModule,
    WorkersModule,
  ],
})
export class AppModule {}
