import type { BullRootModuleOptions } from '@nestjs/bullmq';

export function getBullConfig(): BullRootModuleOptions {
  const redisHost = process.env.REDIS_HOST ?? 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT ?? '6379', 10);
  const redisDb = parseInt(process.env.REDIS_DB ?? '0', 10);

  return {
    connection: {
      host: redisHost,
      port: redisPort,
      db: redisDb,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      enableOfflineQueue: true,
    },
  };
}
