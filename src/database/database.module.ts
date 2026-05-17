import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmConfig } from '../config/typeorm.config';
import { JobAuditModel, JobAuditRepository } from '@volontariapp/workers';

@Module({
  imports: [
    TypeOrmModule.forRoot(getTypeOrmConfig()),
    TypeOrmModule.forFeature([JobAuditModel]),
  ],
  providers: [JobAuditRepository],
  exports: [JobAuditRepository],
})
export class DatabaseModule {}
