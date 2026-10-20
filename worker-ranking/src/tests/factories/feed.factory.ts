import type { RankingPost } from '../../clients/interfaces/ranking-post.interface.js';
import type { FeedCandidate } from '../../scoring/interfaces/feed-candidate.interface.js';
import { NOW } from './ranking.factory.js';

const HOUR_MS = 60 * 60 * 1000;

export const AUTHOR_A = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
export const AUTHOR_B = 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb';
export const AUTHOR_C = 'cccccccc-cccc-4ccc-accc-cccccccccccc';

export const buildRankingPost = (
  id: string,
  overrides: Partial<RankingPost> = {},
): RankingPost => ({
  id,
  authorId: AUTHOR_A,
  createdAt: new Date(NOW.getTime() - 2 * HOUR_MS),
  mediaVisible: true,
  ...overrides,
});

export const buildFeedCandidate = (
  post: RankingPost,
  overrides: Partial<FeedCandidate> = {},
): FeedCandidate => ({
  post,
  origin: 'FOLLOWED',
  eventTie: 'NONE',
  signals: [],
  followed: true,
  friend: false,
  alreadyEngaged: false,
  ...overrides,
});
