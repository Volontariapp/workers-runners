import { Module, type OnApplicationShutdown, Inject } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '@volontariapp/auth';
import { Logger } from '@volontariapp/logger';
import { RankingQueue } from '@volontariapp/messaging';
import { JobAuditRepository } from '@volontariapp/workers';
import { JobAuditModel } from '@volontariapp/database';
import { NoopRankingScorer } from '@volontariapp/domain-ranking';
import { PostgresProvider, RedisProvider } from '@volontariapp/bridge';
import { CustomConfig } from './config/custom-config.js';
import { config } from './config/runtime-config.js';
import { logger } from './config/logger.js';
import { initDatabase } from './providers/database.provider.js';
import { initRedis } from './providers/redis.provider.js';
import { GrpcClientModule } from './infrastructure/grpc/grpc-client.module.js';
import { InternalMetadataProvider } from './clients/internal-metadata.provider.js';
import { EventRankingClient } from './clients/event-ranking.client.js';
import { SocialRankingClient } from './clients/social-ranking.client.js';
import { rankingDomainProviders } from './domain/ranking-domain.providers.js';
import { RankingJobWriter } from './domain/ranking-job-writer.js';
import { EventCandidateService } from './scoring/event-candidate.service.js';
import { RANKING_SCORER } from './scoring/constants/ranking-scorer.constants.js';
import { EventScoringService } from './scoring/event-scoring.service.js';
import {
  ComputeUserRankingHandler,
  FanoutRankingHandler,
} from './workers/handlers/index.js';
import { RankingWorker, FallbackRankingWorker } from './workers/index.js';

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
    BullModule.registerQueue(
      { name: RankingQueue.RANKING },
      { name: RankingQueue.FALLBACK_RANKING },
    ),
    AuthModule.registerGateway(config.auth),
    GrpcClientModule,
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
    ...rankingDomainProviders,
    { provide: RANKING_SCORER, useClass: NoopRankingScorer },
    InternalMetadataProvider,
    SocialRankingClient,
    EventRankingClient,
    RankingJobWriter,
    EventCandidateService,
    EventScoringService,
    ComputeUserRankingHandler,
    FanoutRankingHandler,
    RankingWorker,
    FallbackRankingWorker,
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
