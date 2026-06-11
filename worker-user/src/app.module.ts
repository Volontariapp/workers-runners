import { Module, type OnApplicationShutdown, Inject } from '@nestjs/common';
import { JwtService } from '@volontariapp/auth';
import { loadConfig } from '@volontariapp/config';
import { Logger } from '@volontariapp/logger';
import { JobAuditRepository } from '@volontariapp/workers';
import { JobAuditModel } from '@volontariapp/database';
import { CustomConfig } from './config/custom-config.js';
import { resolveConfigDirectory } from './config/resolve-config-directory.js';
import { initDatabase } from './providers/database.provider.js';
import { initRedis } from './providers/redis.provider.js';
import { PostgresProvider, RedisProvider } from '@volontariapp/bridge';
import { SendWelcomeEmailHandler } from './handlers/send-welcome-email.handler.js';
import { ResetPasswordHandler } from './handlers/reset-password.handler.js';
import { FallbackGetMyFollowsHandler } from './handlers/fallback/fallback-get-my-follows.handler.js';
import { FallbackGetMyFollowersHandler } from './handlers/fallback/fallback-get-my-followers.handler.js';
import { FallbackGetPostLikersHandler } from './handlers/fallback/fallback-get-post-likers.handler.js';
import { FallbackGetEventParticipantsHandler } from './handlers/fallback/fallback-get-event-participants.handler.js';
import { FallbackCreateBadgeHandler } from './handlers/fallback/fallback-create-badge.handler.js';
import { FallbackUpdateBadgeHandler } from './handlers/fallback/fallback-update-badge.handler.js';
import { FallbackDeleteBadgeHandler } from './handlers/fallback/fallback-delete-badge.handler.js';
import { FallbackSignUpHandler } from './handlers/fallback/fallback-sign-up.handler.js';
import { FallbackUpdateUserHandler } from './handlers/fallback/fallback-update-user.handler.js';
import { FallbackDeleteUserHandler } from './handlers/fallback/fallback-delete-user.handler.js';
import { FallbackAddBadgeToUserHandler } from './handlers/fallback/fallback-add-badge-to-user.handler.js';
import { FallbackRemoveBadgeFromUserHandler } from './handlers/fallback/fallback-remove-badge-from-user.handler.js';
import { FallbackIncrementImpactScoreHandler } from './handlers/fallback/fallback-increment-impact-score.handler.js';
import { UserWorker } from './workers/user.worker.js';
import { FallbackUserWorker } from './workers/fallback-user.worker.js';
import { BullModule } from '@nestjs/bullmq';
import { UserQueue } from '@volontariapp/messaging';
import {
  AuthService,
  BadgeService,
  UserService,
  PostgresUserRepository,
  PostgresBadgeRepository,
  UserModel,
  BadgeModel,
} from '@volontariapp/domain-user';

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
    {
      provide: PostgresUserRepository,
      useFactory: (
        postgresProvider: PostgresProvider,
        customConfig: CustomConfig,
      ) => {
        const dataSource = postgresProvider.getDriver();
        const typeormRepo = dataSource.getRepository(UserModel);
        return new PostgresUserRepository(
          typeormRepo,
          customConfig.emailEncryptionSecret,
        );
      },
      inject: [PostgresProvider, CustomConfig],
    },
    {
      provide: PostgresBadgeRepository,
      useFactory: (postgresProvider: PostgresProvider) => {
        const dataSource = postgresProvider.getDriver();
        const typeormRepo = dataSource.getRepository(BadgeModel);
        return new PostgresBadgeRepository(typeormRepo);
      },
      inject: [PostgresProvider],
    },
    {
      provide: JwtService,
      useFactory: (customConfig: CustomConfig) => {
        return new JwtService(customConfig.auth);
      },
      inject: [CustomConfig],
    },
    SendWelcomeEmailHandler,
    ResetPasswordHandler,
    FallbackGetMyFollowsHandler,
    FallbackGetMyFollowersHandler,
    FallbackGetPostLikersHandler,
    FallbackGetEventParticipantsHandler,
    FallbackCreateBadgeHandler,
    FallbackUpdateBadgeHandler,
    FallbackDeleteBadgeHandler,
    FallbackSignUpHandler,
    FallbackUpdateUserHandler,
    FallbackDeleteUserHandler,
    FallbackAddBadgeToUserHandler,
    FallbackRemoveBadgeFromUserHandler,
    FallbackIncrementImpactScoreHandler,
    UserWorker,
    FallbackUserWorker,
    AuthService,
    BadgeService,
    UserService,
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
