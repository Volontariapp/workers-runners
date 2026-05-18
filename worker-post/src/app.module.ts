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
import { PublishPostHandler } from './workers/handlers/publish-post.handler.js';
import { PostWorker } from './workers/post.worker.js';
import { BullModule } from '@nestjs/bullmq';
import { PostQueue } from '@volontariapp/messaging';

const configDir = resolveConfigDirectory();
const config = loadConfig(configDir, CustomConfig);
const logger = new Logger({
  context: 'WORKER-POST',
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
      name: PostQueue.POST,
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
        return datasource.getRepository(JobAuditModel);
      },
      inject: [PostgresProvider],
    },
    PublishPostHandler,
    PostWorker,
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
      `Shutdown signal received: ${signal ?? 'none'}. Closing background connection pools...`,
    );
    await Promise.all([
      this.postgresProvider.disconnect(),
      this.redisProvider.disconnect(),
    ]);
    logger.info('Database and Redis connection pools closed successfully.');
  }
}
export { logger };
