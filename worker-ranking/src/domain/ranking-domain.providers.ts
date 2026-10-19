import type { Provider } from '@nestjs/common';
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
import { repositoryProvider } from './helpers/repository-provider.helpers.js';

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
