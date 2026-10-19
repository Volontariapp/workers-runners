import { Module, type OnApplicationShutdown, Inject } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { loadConfig } from '@volontariapp/config';
import { Logger } from '@volontariapp/logger';
import { JobAuditRepository } from '@volontariapp/workers';
import { JobAuditModel } from '@volontariapp/database';
import { PostgresProvider, RedisProvider } from '@volontariapp/bridge';
import { StorageQueue } from '@volontariapp/messaging';
import {
  FileModel,
  PostgresFileRepository,
} from '@volontariapp/domain-storage';
import { StoragePipelineService } from '@volontariapp/storage-pipeline';
import { CustomConfig } from './config/custom-config.js';
import { resolveConfigDirectory } from './config/resolve-config-directory.js';
import { initDatabase } from './providers/database.provider.js';
import { initRedis } from './providers/redis.provider.js';
import { ScanFileHandler } from './workers/handlers/scan-file.handler.js';
import { StorageWorker } from './workers/storage.worker.js';

const configDir = resolveConfigDirectory();
const config = loadConfig(configDir, CustomConfig);
Logger.setDefaultConfig({ format: config.logger.format });
const logger = new Logger({
  context: 'WORKER-STORAGE',
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
      name: StorageQueue.STORAGE,
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
    {
      provide: PostgresFileRepository,
      useFactory: (postgresProvider: PostgresProvider) => {
        const dataSource = postgresProvider.getDriver();
        const typeormRepo = dataSource.getRepository(FileModel);
        return new PostgresFileRepository(typeormRepo);
      },
      inject: [PostgresProvider],
    },
    {
      provide: StoragePipelineService,
      useFactory: (customConfig: CustomConfig) => {
        return new StoragePipelineService({
          s3: {
            endpoint: customConfig.s3.endpoint,
            publicEndpoint: customConfig.s3.publicEndpoint,
            region: customConfig.s3.region,
            accessKeyId: customConfig.s3.accessKey,
            secretAccessKey: customConfig.s3.secretKey,
            privateBucket: customConfig.s3.privateBucket,
            publicBucket: customConfig.s3.publicBucket,
            publicBaseUrl: customConfig.s3.publicBaseUrl,
            forcePathStyle: true,
          },
          scanner: {
            host: customConfig.scanner.host,
            port: customConfig.scanner.port,
            timeoutMs: customConfig.scanner.timeoutMs,
          },
        });
      },
      inject: [CustomConfig],
    },
    ScanFileHandler,
    StorageWorker,
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
