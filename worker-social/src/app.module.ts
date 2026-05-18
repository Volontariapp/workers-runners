import { Module, type OnApplicationShutdown, Inject } from '@nestjs/common';
import { loadConfig } from '@volontariapp/config';
import { Logger } from '@volontariapp/logger';
import { JobAuditRepository } from '@volontariapp/workers';
import { JobAuditModel } from '@volontariapp/database';
import { CustomConfig } from './config/custom-config.js';
import { resolveConfigDirectory } from './config/resolve-config-directory.js';
import { initDatabase } from './providers/database.provider.js';
import { initRedis } from './providers/redis.provider.js';
import { PostgresProvider, RedisProvider } from '@volontariapp/bridge';
import { FollowUserHandler } from './workers/handlers/follow-user.handler.js';
import { SocialWorker } from './workers/social.worker.js';
import { BullModule } from '@nestjs/bullmq';
import { SocialQueue } from '@volontariapp/messaging';

const configDir = resolveConfigDirectory();
const config = loadConfig(configDir, CustomConfig);
const logger = new Logger({
  context: 'WORKER-SOCIAL',
  format: config.logger.format,
});

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.dbIndex,
      },
    }),
    BullModule.registerQueue({
      name: SocialQueue.SOCIAL,
    }),
  ],
  providers: [
    {
      provide: CustomConfig,
      useValue: config,
    },
    {
      provide: Logger,
      useValue: logger,
    },
    {
      provide: PostgresProvider,
      useFactory: async (logger: Logger) => {
        return initDatabase(config.db, logger);
      },
      inject: [Logger],
    },
    {
      provide: RedisProvider,
      useFactory: async (logger: Logger) => {
        return initRedis(config.redis, logger);
      },
      inject: [Logger],
    },
    {
      provide: JobAuditRepository,
      useFactory: (postgres: PostgresProvider) => {
        const datasource = postgres.getDriver();
        const typeormRepo = datasource.getRepository(JobAuditModel);
        return new JobAuditRepository(typeormRepo);
      },
      inject: [PostgresProvider],
    },
    FollowUserHandler,
    SocialWorker,
  ],
})
export class AppModule implements OnApplicationShutdown {
  constructor(
    @Inject(PostgresProvider)
    private readonly postgresProvider: PostgresProvider,
    @Inject(RedisProvider) private readonly redisProvider: RedisProvider,
  ) {}

  async onApplicationShutdown(signal?: string) {
    logger.info(
      `Shutdown signal received: ${signal ?? ''}. Closing background connection pools...`,
    );
    await Promise.all([
      this.postgresProvider.disconnect(),
      this.redisProvider.disconnect(),
    ]);
    logger.info('Database and Redis connection pools closed successfully.');
  }
}
export { logger };
