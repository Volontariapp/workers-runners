import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { PostgresProvider } from '@volontariapp/bridge';
import { JwtService } from '@volontariapp/auth';
import {
  NoopRankingScorer,
  RankingFeedbackService,
  RankingLocationService,
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
import { CustomConfig } from '../../config/custom-config.js';
import { RankingJobWriter } from '../../domain/ranking-job-writer.js';
import { EventCandidateService } from '../../scoring/event-candidate.service.js';
import {
  EventScoringService,
  RANKING_SCORER,
} from '../../scoring/event-scoring.service.js';
import {
  EVENT_PACKAGE,
  SOCIAL_PACKAGE,
} from '../../infrastructure/grpc/constants.js';
import {
  ComputeUserRankingHandler,
  FanoutRankingHandler,
} from '../../workers/handlers/index.js';
import { FallbackRankingWorker, RankingWorker } from '../../workers/index.js';
import { buildConfig } from '../factories/ranking.factory.js';

const leaf = (token: unknown) => ({
  provide: token,
  useValue: createMock<object>(),
});

describe('worker-ranking dependency injection (Unit)', () => {
  it('resolves the workers, handlers, services and clients with their real tokens', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: CustomConfig, useValue: buildConfig() },
        leaf(PostgresProvider),
        leaf(JobAuditRepository),
        leaf(JwtService),
        leaf(SOCIAL_PACKAGE),
        leaf(EVENT_PACKAGE),
        leaf(RankingRunService),
        leaf(RankingRequestService),
        leaf(RankingScoreService),
        leaf(RankingLocationService),
        leaf(RankingFeedbackService),
        leaf(RankingWishService),
        leaf(RankingMentionService),
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
    }).compile();

    expect(moduleRef.get(RankingWorker)).toBeInstanceOf(RankingWorker);
    expect(moduleRef.get(FallbackRankingWorker)).toBeInstanceOf(
      FallbackRankingWorker,
    );
    expect(moduleRef.get(ComputeUserRankingHandler).jobType).toBe(
      'ranking.compute_user_ranking',
    );
    expect(moduleRef.get(FanoutRankingHandler).jobType).toBe('ranking.fanout');
  });

  it('uses the structural-only scorer by default', async () => {
    const scorer = new NoopRankingScorer();

    expect((await scorer.score()).size).toBe(0);
  });
});
