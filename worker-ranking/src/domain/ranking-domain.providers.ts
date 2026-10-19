import type { Provider } from '@nestjs/common';
import { PostgresProvider } from '@volontariapp/bridge';
import {
  PostgresRankingEventFeedbackRepository,
  PostgresRankingEventMentionRepository,
  PostgresRankingEventWishRepository,
  PostgresRankingLocationRepository,
  PostgresRankingRequestRepository,
  PostgresRankingRunRepository,
  PostgresRankingScoreRepository,
  RankingEventFeedbackModel,
  RankingEventMentionModel,
  RankingEventWishModel,
  RankingFeedbackService,
  RankingLocationService,
  RankingMentionService,
  RankingRequestService,
  RankingRunService,
  RankingScoreService,
  RankingRunModel,
  RankingRequestModel,
  RankingScoreModel,
  RankingUserLocationModel,
  RankingWishService,
} from '@volontariapp/domain-ranking';
import type { EntityTarget, ObjectLiteral, Repository } from 'typeorm';

/** Un depot de domain-ranking, construit sur le depot TypeORM de la source de donnees du worker. */
const repositoryProvider = <TModel extends ObjectLiteral, TRepository>(
  repository: new (typeormRepository: Repository<TModel>) => TRepository,
  model: EntityTarget<TModel>,
): Provider => ({
  provide: repository,
  useFactory: (postgres: PostgresProvider): TRepository =>
    new repository(postgres.getDriver().getRepository(model)),
  inject: [PostgresProvider],
});

export const rankingDomainProviders: Provider[] = [
  repositoryProvider(PostgresRankingRunRepository, RankingRunModel),
  repositoryProvider(PostgresRankingRequestRepository, RankingRequestModel),
  repositoryProvider(PostgresRankingScoreRepository, RankingScoreModel),
  repositoryProvider(
    PostgresRankingLocationRepository,
    RankingUserLocationModel,
  ),
  repositoryProvider(
    PostgresRankingEventFeedbackRepository,
    RankingEventFeedbackModel,
  ),
  repositoryProvider(PostgresRankingEventWishRepository, RankingEventWishModel),
  repositoryProvider(
    PostgresRankingEventMentionRepository,
    RankingEventMentionModel,
  ),
  RankingRunService,
  RankingRequestService,
  RankingScoreService,
  RankingLocationService,
  RankingFeedbackService,
  RankingWishService,
  RankingMentionService,
];
