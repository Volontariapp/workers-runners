import { createMock } from '@volontariapp/testing';
import type { jest } from '@jest/globals';
import type {
  RankingLikeLogService,
  RankingPostScoreService,
} from '@volontariapp/domain-ranking';
import type { PostRankingClient } from '../../clients/post-ranking.client.js';
import type { SocialFeedClient } from '../../clients/social-feed.client.js';
import type { FeedCandidateService } from '../../scoring/feed-candidate.service.js';
import type { FeedSignalService } from '../../scoring/feed-signal.service.js';

export const createMockPostClient = (): jest.Mocked<PostRankingClient> =>
  createMock<PostRankingClient>();
export const createMockSocialFeedClient = (): jest.Mocked<SocialFeedClient> =>
  createMock<SocialFeedClient>();
export const createMockLikeLogService =
  (): jest.Mocked<RankingLikeLogService> => createMock<RankingLikeLogService>();
export const createMockPostScoreService =
  (): jest.Mocked<RankingPostScoreService> =>
    createMock<RankingPostScoreService>();
export const createMockFeedSignals = (): jest.Mocked<FeedSignalService> =>
  createMock<FeedSignalService>();
export const createMockFeedCandidates = (): jest.Mocked<FeedCandidateService> =>
  createMock<FeedCandidateService>();
