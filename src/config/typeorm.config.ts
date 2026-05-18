import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {JobAuditModel} from '@volontariapp/workers';

export function getTypeOrmConfig(): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgres://user:password@localhost:5432/ms_user',
    entities: [JobAuditModel],
    synchronize: false,
    logging: process.env.TYPEORM_LOGGING === 'true',
  };
}
