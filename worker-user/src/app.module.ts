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
import { SendWelcomeEmailHandler } from './workers/handlers/send-welcome-email.handler.js';
import { ResetPasswordHandler } from './workers/handlers/reset-password.handler.js';
import { UserWorker } from './workers/user.worker.js';
import { BullModule } from '@nestjs/bullmq';
import { UserQueue } from '@volontariapp/messaging';

const configDir = resolveConfigDirectory();
const config = loadConfig(configDir, CustomConfig);
const logger = new Logger({
  context: 'WORKER-USER',
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
      name: UserQueue.USER,
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
      useFactory: async (customConfig: CustomConfig, log: Logger) => {
        return initDatabase(customConfig.db, log);
      },
      inject: [CustomConfig, Logger],
    },
    {
      provide: RedisProvider,
      useFactory: async (customConfig: CustomConfig, log: Logger) => {
        return initRedis(customConfig.redis, log);
      },
      inject: [CustomConfig, Logger],
    },
    {
      provide: JobAuditRepository,
      useFactory: (postgresProvider: PostgresProvider) => {
        const dataSource = postgresProvider.getDriver();
        const typeormRepo = dataSource.getRepository(JobAuditModel);
        return new JobAuditRepository(typeormRepo);
      },
      inject: [PostgresProvider],
    },
    SendWelcomeEmailHandler,
    ResetPasswordHandler,
    UserWorker,
  ],
})
export class AppModule implements OnApplicationShutdown {
  constructor(
    @Inject(PostgresProvider) private readonly dbProvider: PostgresProvider,
    @Inject(RedisProvider) private readonly redisProvider: RedisProvider,
  ) {}

  async onApplicationShutdown(signal?: string) {
    logger.info(
      `Shutdown signal received: ${signal ?? 'none'}. Closing background connection pools...`,
    );
    await Promise.all([
      this.dbProvider.disconnect(),
      this.redisProvider.disconnect(),
    ]);
    logger.info('Database and Redis connection pools closed successfully.');
  }
}
export { logger };
