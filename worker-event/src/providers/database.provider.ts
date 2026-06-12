import { PostgresProvider } from '@volontariapp/bridge';
import type { PostgresConfig, IPostgresConfig } from '@volontariapp/config';
import type { Logger } from '@volontariapp/logger';
import { PostgresBridgeHealthProvider } from '@volontariapp/health-check';
import { JobAuditEntity } from '@volontariapp/workers';
import {
  JobAuditModel,
  EventQueueModel,
  EventQueueEntity,
} from '@volontariapp/database';
import {
  EventModel,
  TagModel,
  RequirementModel,
  EventEntity,
  TagEntity,
  RequirementEntity,
} from '@volontariapp/domain-event';
import { databaseMapper } from '@volontariapp/database';
import { instanceToPlain } from 'class-transformer';

databaseMapper.registerBidirectional(JobAuditModel, JobAuditEntity);
databaseMapper.registerBidirectional(EventQueueModel, EventQueueEntity);
databaseMapper.registerBidirectional(EventModel, EventEntity);
databaseMapper.registerBidirectional(TagModel, TagEntity);
databaseMapper.registerBidirectional(RequirementModel, RequirementEntity);

export async function initDatabase(
  config: PostgresConfig,
  logger: Logger,
): Promise<PostgresProvider> {
  const dbProvider = new PostgresProvider({
    ...(instanceToPlain(config) as IPostgresConfig),
    entities: [
      JobAuditModel,
      EventQueueModel,
      EventModel,
      TagModel,
      RequirementModel,
    ],
    synchronize: false,
  });

  try {
    await dbProvider.connect();
    const healthProvider = new PostgresBridgeHealthProvider(dbProvider);
    const health = await healthProvider.health();
    if (health.status !== 'up') {
      throw new Error(`Database health check failed: ${health.message}`);
    }
    logger.info('Database connection verified and ready via health-check');
    return dbProvider;
  } catch (err: unknown) {
    logger.error('Failed to initialize database connection', { err });
    throw err;
  }
}
