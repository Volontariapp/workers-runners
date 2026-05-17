import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {JobAuditModel} from '@volontariapp/workers';

export function getTypeOrmConfig(): TypeOrmModuleOptions {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [JobAuditModel],
    synchronize: false,
    logging: process.env.TYPEORM_LOGGING === 'true',
  };
}
