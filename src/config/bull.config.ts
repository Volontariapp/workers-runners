import type { BullRootModuleOptions } from '@nestjs/bullmq';

export function getBullConfig(): BullRootModuleOptions {
  return {
    connection: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      db: parseInt(process.env.REDIS_DB ?? '0', 10),
      username: process.env.REDIS_USERNAME ?? 'default',
      password: process.env.REDIS_PASSWORD ?? 'password',
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: true,
    },
  };
}
