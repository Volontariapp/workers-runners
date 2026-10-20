import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { PostgresProvider } from '@volontariapp/bridge';
import { JwtService } from '@volontariapp/auth';
import {
  NoopRankingScorer,
  RankingFeedbackService,
  RankingLikeLogService,
  RankingLocationService,
  RankingPostScoreService,
  RankingMentionService,
  RankingRequestService,
  RankingRunService,
  RankingScoreService,
  RankingWishService,
} from '@volontariapp/domain-ranking';
import { JobAuditRepository } from '@volontariapp/workers';
import { createMock } from '@volontariapp/testing';
import { InternalMetadataProvider } from '../../clients/internal-metadata.provider.js';
import { EventRankingClient } from '../../clients/event-ranking.client.js';
import { SocialRankingClient } from '../../clients/social-ranking.client.js';
import { SocialFeedClient } from '../../clients/social-feed.client.js';
import { PostRankingClient } from '../../clients/post-ranking.client.js';
import { CustomConfig } from '../../config/custom-config.js';
import { RankingJobWriter } from '../../domain/ranking-job-writer.js';
import { EventCandidateService } from '../../scoring/event-candidate.service.js';
import { RANKING_SCORER } from '../../scoring/constants/ranking-scorer.constants.js';
import { EventScoringService } from '../../scoring/event-scoring.service.js';
import { FeedCandidateService } from '../../scoring/feed-candidate.service.js';
import { FeedScoringService } from '../../scoring/feed-scoring.service.js';
import { FeedSignalService } from '../../scoring/feed-signal.service.js';
import {
  EVENT_PACKAGE,
  POST_PACKAGE,
  SOCIAL_PACKAGE,
} from '../../infrastructure/grpc/constants.js';
import {
  ComputeUserFeedHandler,
  ComputeUserRankingHandler,
  FanoutRankingHandler,
} from '../../workers/handlers/index.js';
import {
  FallbackRankingWorker,
  RankingFeedWorker,
  RankingWorker,
} from '../../workers/index.js';
import { buildConfig } from '../factories/ranking.factory.js';

import { JevRankingScorer } from '../../scoring/adapters/jev-ranking-scorer.js';
import { Logger } from '@volontariapp/logger';

const leaf = (token: unknown) => ({
  provide: token,
  useValue: createMock<object>(),
});

describe('worker-ranking dependency injection (Unit)', () => {
  it('resolves the workers, handlers, services and clients with their real tokens', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: CustomConfig, useValue: buildConfig() },
        { provide: Logger, useValue: new Logger({ context: 'Test' }) },
        leaf(PostgresProvider),
        leaf(JobAuditRepository),
        leaf(JwtService),
        leaf(SOCIAL_PACKAGE),
        leaf(EVENT_PACKAGE),
        leaf(POST_PACKAGE),
        leaf(RankingRunService),
        leaf(RankingRequestService),
        leaf(RankingScoreService),
        leaf(RankingLocationService),
        leaf(RankingFeedbackService),
        leaf(RankingWishService),
        leaf(RankingMentionService),
        leaf(RankingPostScoreService),
        leaf(RankingLikeLogService),
        {
          provide: RANKING_SCORER,
          useFactory: (customConfig: CustomConfig, log: Logger) => {
            if (
              !customConfig.ranking.jevEnabled ||
              !customConfig.ranking.jevApiKey
            ) {
              return new NoopRankingScorer();
            }
            return new JevRankingScorer(customConfig, log);
          },
          inject: [CustomConfig, Logger],
        },
        InternalMetadataProvider,
        SocialRankingClient,
        EventRankingClient,
        SocialFeedClient,
        PostRankingClient,
        RankingJobWriter,
        EventCandidateService,
        EventScoringService,
        FeedSignalService,
        FeedCandidateService,
        FeedScoringService,
        ComputeUserRankingHandler,
        ComputeUserFeedHandler,
        FanoutRankingHandler,
        RankingWorker,
        RankingFeedWorker,
        FallbackRankingWorker,
      ],
    }).compile();

    expect(moduleRef.get(RankingWorker)).toBeInstanceOf(RankingWorker);
    expect(moduleRef.get(FallbackRankingWorker)).toBeInstanceOf(
      FallbackRankingWorker,
    );
    expect(moduleRef.get(ComputeUserRankingHandler).jobType).toBe(
      'ranking.compute_user_ranking',
    );
    expect(moduleRef.get(FanoutRankingHandler).jobType).toBe('ranking.fanout');
    expect(moduleRef.get(RankingFeedWorker)).toBeInstanceOf(RankingFeedWorker);
    expect(moduleRef.get(ComputeUserFeedHandler).jobType).toBe(
      'ranking.compute_user_feed',
    );
    expect(moduleRef.get(RANKING_SCORER)).toBeInstanceOf(NoopRankingScorer);
  });

  it('resolves JevRankingScorer when jevApiKey is defined', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: CustomConfig,
          useValue: buildConfig({ jevApiKey: 'test-key' }),
        },
        { provide: Logger, useValue: new Logger({ context: 'Test' }) },
        {
          provide: RANKING_SCORER,
          useFactory: (customConfig: CustomConfig, log: Logger) => {
            if (!customConfig.ranking.jevApiKey) {
              return new NoopRankingScorer();
            }
            return new JevRankingScorer(customConfig, log);
          },
          inject: [CustomConfig, Logger],
        },
      ],
    }).compile();

    expect(moduleRef.get(RANKING_SCORER)).toBeInstanceOf(JevRankingScorer);
  });

  it('resolves NoopRankingScorer when jevEnabled is false even with jevApiKey', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: CustomConfig,
          useValue: buildConfig({ jevEnabled: false, jevApiKey: 'test-key' }),
        },
        { provide: Logger, useValue: new Logger({ context: 'Test' }) },
        {
          provide: RANKING_SCORER,
          useFactory: (customConfig: CustomConfig, log: Logger) => {
            if (
              !customConfig.ranking.jevEnabled ||
              !customConfig.ranking.jevApiKey
            ) {
              return new NoopRankingScorer();
            }
            return new JevRankingScorer(customConfig, log);
          },
          inject: [CustomConfig, Logger],
        },
      ],
    }).compile();

    expect(moduleRef.get(RANKING_SCORER)).toBeInstanceOf(NoopRankingScorer);
  });

  it('uses the structural-only scorer by default', async () => {
    const scorer = new NoopRankingScorer();

    expect((await scorer.score()).size).toBe(0);
  });
});
