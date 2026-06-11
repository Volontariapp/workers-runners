import { Module, type OnApplicationShutdown, Inject } from '@nestjs/common';
import { loadConfig } from '@volontariapp/config';
import { Logger } from '@volontariapp/logger';
import { JobAuditRepository } from '@volontariapp/workers';
import { JobAuditModel } from '@volontariapp/database';
import { CustomConfig } from './config/custom-config.js';
import { resolveConfigDirectory } from './config/resolve-config-directory.js';
import { initDatabase } from './providers/database.provider.js';
import { initRedis } from './providers/redis.provider.js';
import {
  PostgresProvider,
  RedisProvider,
  Neo4jProvider,
} from '@volontariapp/bridge';
import {
  Neo4jBridgeModule,
  NestNeo4jProvider,
} from '@volontariapp/bridge-nest';
import { FollowUserHandler } from './workers/handlers/follow-user.handler.js';
import { SocialWorker } from './workers/social.worker.js';
import { BullModule } from '@nestjs/bullmq';
import { SocialQueue } from '@volontariapp/messaging';
import {
  SocialUserService,
  RelationshipService,
  PublicationService,
  InteractionService,
  ParticipationService,
  EventPostLinkService,
  Neo4jSocialUserRepository,
  Neo4jRelationshipRepository,
  Neo4jPublicationRepository,
  Neo4jInteractionRepository,
  Neo4jParticipationRepository,
  Neo4jEventPostLinkRepository,
} from '@volontariapp/domain-social';

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
    Neo4jBridgeModule.register(config.neo4j),
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
    SocialUserService,
    RelationshipService,
    PublicationService,
    InteractionService,
    ParticipationService,
    EventPostLinkService,
    Neo4jSocialUserRepository,
    Neo4jRelationshipRepository,
    Neo4jPublicationRepository,
    Neo4jInteractionRepository,
    Neo4jParticipationRepository,
    Neo4jEventPostLinkRepository,
  ],
})
export class AppModule implements OnApplicationShutdown {
  constructor(
    @Inject(PostgresProvider)
    private readonly postgresProvider: PostgresProvider,
    @Inject(RedisProvider) private readonly redisProvider: RedisProvider,
    @Inject(NestNeo4jProvider) private readonly neo4jProvider: Neo4jProvider,
  ) {}

  async onApplicationShutdown(signal?: string) {
    logger.info(
      `Shutdown signal received: ${signal ?? ''}. Closing background connection pools...`,
    );
    await Promise.all([
      this.postgresProvider.disconnect(),
      this.redisProvider.disconnect(),
      this.neo4jProvider.disconnect(),
    ]);
    logger.info(
      'Database, Redis and Neo4j connection pools closed successfully.',
    );
  }
}
export { logger };
