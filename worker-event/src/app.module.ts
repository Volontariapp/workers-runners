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
import { PublishEventHandler } from './workers/handlers/publish-event.handler.js';
import { FallbackGetUserCreatedEventsHandler } from './workers/handlers/fallback/fallback-get-user-created-events.handler.js';
import { FallbackGetUserParticipatedEventsHandler } from './workers/handlers/fallback/fallback-get-user-participated-events.handler.js';
import { FallbackGetUserWishedEventsHandler } from './workers/handlers/fallback/fallback-get-user-wished-events.handler.js';
import { FallbackCreateEventHandler } from './workers/handlers/fallback/fallback-create-event.handler.js';
import { FallbackUpdateEventHandler } from './workers/handlers/fallback/fallback-update-event.handler.js';
import { FallbackChangeEventStateHandler } from './workers/handlers/fallback/fallback-change-event-state.handler.js';
import { FallbackManageRequirementsHandler } from './workers/handlers/fallback/fallback-manage-requirements.handler.js';
import { FallbackDeleteEventHandler } from './workers/handlers/fallback/fallback-delete-event.handler.js';
import { FallbackCreateTagHandler } from './workers/handlers/fallback/fallback-create-tag.handler.js';
import { FallbackUpdateTagHandler } from './workers/handlers/fallback/fallback-update-tag.handler.js';
import { FallbackDeleteTagHandler } from './workers/handlers/fallback/fallback-delete-tag.handler.js';
import { EventWorker } from './workers/event.worker.js';
import { FallbackEventWorker } from './workers/fallback-event.worker.js';
import { BullModule } from '@nestjs/bullmq';
import { EventsQueue } from '@volontariapp/messaging';
import {
  EventService,
  PostgresEventRepository,
  EventModel,
  TagService,
  TagModel,
  PostgresTagRepository,
  GeocodingService,
  OpenStreetMapStrategy,
  RequirementService,
  RequirementModel,
  PostgresRequirementRepository,
} from '@volontariapp/domain-event';

const configDir = resolveConfigDirectory();
const config = loadConfig(configDir, CustomConfig);
const logger = new Logger({
  context: 'WORKER-EVENT',
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
      name: EventsQueue.EVENTS,
    }),
  ],
  providers: [
    {
      provide: PostgresEventRepository,
      useFactory: (postgres: PostgresProvider) => {
        const datasource = postgres.getDriver();
        const typeormRepo = datasource.getRepository(EventModel);
        return new PostgresEventRepository(typeormRepo);
      },
      inject: [PostgresProvider],
    },
    {
      provide: PostgresTagRepository,
      useFactory: (postgres: PostgresProvider) => {
        const datasource = postgres.getDriver();
        const typeormRepo = datasource.getRepository(TagModel);
        return new PostgresTagRepository(typeormRepo);
      },
      inject: [PostgresProvider],
    },
    {
      provide: PostgresRequirementRepository,
      useFactory: (postgres: PostgresProvider) => {
        const datasource = postgres.getDriver();
        const typeormRepo = datasource.getRepository(RequirementModel);
        return new PostgresRequirementRepository(typeormRepo);
      },
      inject: [PostgresProvider],
    },
    {
      provide: GeocodingService,
      useFactory: () => {
        const primaryStrategy = new OpenStreetMapStrategy('worker-event', true);
        return new GeocodingService(primaryStrategy, primaryStrategy);
      },
    },
    EventService,
    TagService,
    RequirementService,
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
    PublishEventHandler,
    FallbackGetUserCreatedEventsHandler,
    FallbackGetUserParticipatedEventsHandler,
    FallbackGetUserWishedEventsHandler,
    FallbackCreateEventHandler,
    FallbackUpdateEventHandler,
    FallbackChangeEventStateHandler,
    FallbackManageRequirementsHandler,
    FallbackDeleteEventHandler,
    FallbackCreateTagHandler,
    FallbackUpdateTagHandler,
    FallbackDeleteTagHandler,
    EventWorker,
    FallbackEventWorker,
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
