import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { FeedScoringService } from '../../scoring/feed-scoring.service.js';
import {
  AUTHOR_A,
  AUTHOR_B,
  buildFeedCandidate,
  buildRankingPost,
} from '../factories/feed.factory.js';
import { NOW, buildConfig } from '../factories/ranking.factory.js';

const HOUR_MS = 60 * 60 * 1000;

describe('FeedScoringService diversity across personal and GLOBAL posts (Unit)', () => {
  it('applies one diversity pass on the concatenation: a GLOBAL post breaks four personal posts of the same author', () => {
    const personal = [1, 2, 3, 4].map((index) =>
      buildFeedCandidate(
        buildRankingPost(`a${String(index)}`, {
          authorId: AUTHOR_A,
          createdAt: new Date(NOW.getTime() - index * HOUR_MS),
        }),
      ),
    );
    const global = [
      buildFeedCandidate(buildRankingPost('g1', { authorId: AUTHOR_B }), {
        origin: 'GLOBAL',
        followed: false,
      }),
    ];

    const result = new FeedScoringService(buildConfig()).rank(
      { personal, global },
      NOW,
    );

    expect(result.items.map((item) => [item.postId, item.rank])).toEqual([
      ['a1', 1],
      ['a2', 2],
      ['a3', 3],
      ['g1', 4],
      ['a4', 5],
    ]);
  });

  it('keeps the four posts in a row when no other author exists', () => {
    const personal = [1, 2, 3, 4].map((index) =>
      buildFeedCandidate(
        buildRankingPost(`a${String(index)}`, {
          createdAt: new Date(NOW.getTime() - index * HOUR_MS),
        }),
      ),
    );

    const result = new FeedScoringService(buildConfig()).rank(
      { personal, global: [] },
      NOW,
    );

    expect(result.items.map((item) => item.postId)).toEqual([
      'a1',
      'a2',
      'a3',
      'a4',
    ]);
  });
});
