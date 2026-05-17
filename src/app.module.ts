import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from './database/database.module.js';
import { WorkersModule } from './workers/workers.module.js';
import { getBullConfig } from './config/bull.config.js';

@Module({
  imports: [
    BullModule.forRoot(getBullConfig()),
    DatabaseModule,
    WorkersModule,
  ],
})
export class AppModule {}
