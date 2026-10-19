import { createMock } from '@volontariapp/testing';
import type { jest } from '@jest/globals';
import type {
  RankingFeedbackService,
  RankingLocationService,
  RankingMentionService,
  RankingRequestService,
  RankingRunService,
  RankingScoreService,
  RankingScorer,
  RankingWishService,
} from '@volontariapp/domain-ranking';
import type { EventRankingClient } from '../../clients/event-ranking.client.js';
import type { SocialRankingClient } from '../../clients/social-ranking.client.js';
import type { RankingJobWriter } from '../../domain/ranking-job-writer.js';
import type { EventCandidateService } from '../../scoring/event-candidate.service.js';
import type { EventScoringService } from '../../scoring/event-scoring.service.js';

export const createMockRunService = (): jest.Mocked<RankingRunService> =>
  createMock<RankingRunService>();
export const createMockRequestService =
  (): jest.Mocked<RankingRequestService> => createMock<RankingRequestService>();
export const createMockScoreService = (): jest.Mocked<RankingScoreService> =>
  createMock<RankingScoreService>();
export const createMockLocationService =
  (): jest.Mocked<RankingLocationService> =>
    createMock<RankingLocationService>();
export const createMockFeedbackService =
  (): jest.Mocked<RankingFeedbackService> =>
    createMock<RankingFeedbackService>();
export const createMockWishService = (): jest.Mocked<RankingWishService> =>
  createMock<RankingWishService>();
export const createMockMentionService =
  (): jest.Mocked<RankingMentionService> => createMock<RankingMentionService>();
export const createMockSocialClient = (): jest.Mocked<SocialRankingClient> =>
  createMock<SocialRankingClient>();
export const createMockEventClient = (): jest.Mocked<EventRankingClient> =>
  createMock<EventRankingClient>();
export const createMockJobWriter = (): jest.Mocked<RankingJobWriter> =>
  createMock<RankingJobWriter>();
export const createMockCandidates = (): jest.Mocked<EventCandidateService> =>
  createMock<EventCandidateService>();
export const createMockScoring = (): jest.Mocked<EventScoringService> =>
  createMock<EventScoringService>();
export const createMockScorer = (): jest.Mocked<RankingScorer> =>
  createMock<RankingScorer>();
