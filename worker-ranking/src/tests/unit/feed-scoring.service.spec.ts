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

describe('FeedScoringService (Unit)', () => {
  const scoring = new FeedScoringService(buildConfig());

  it('demotes an already liked post by 0.6 against the same post untouched', () => {
    const post = buildRankingPost('p1');
    const fresh = scoring.rank(
      { personal: [buildFeedCandidate(post)], global: [] },
      NOW,
    );
    const liked = scoring.rank(
      {
        personal: [buildFeedCandidate(post, { alreadyEngaged: true })],
        global: [],
      },
      NOW,
    );

    const freshScore = fresh.items[0]?.score ?? 0;
    expect(liked.items[0]?.score).toBeCloseTo(freshScore * 0.6, 3);
  });

  it('ranks a post linked to a future wished event above a plain followed post', () => {
    const result = scoring.rank(
      {
        personal: [
          buildFeedCandidate(buildRankingPost('plain')),
          buildFeedCandidate(buildRankingPost('tied', { authorId: AUTHOR_B }), {
            eventTie: 'FUTURE_WISHED',
            origin: 'EVENT',
            followed: false,
          }),
        ],
        global: [],
      },
      NOW,
    );

    expect(result.items.map((item) => item.postId)).toEqual(['tied', 'plain']);
    expect(result.items[0]?.reasons).toContain('LINKED_EVENT_WISHED');
    expect(result.items[0]?.origin).toBe('EVENT');
  });

  it('places the GLOBAL complement after the personal posts, even with a higher score', () => {
    const result = scoring.rank(
      {
        personal: [
          buildFeedCandidate(
            buildRankingPost('old', {
              createdAt: new Date(NOW.getTime() - 100 * HOUR_MS),
            }),
          ),
        ],
        global: [
          buildFeedCandidate(buildRankingPost('new', { authorId: AUTHOR_B }), {
            origin: 'GLOBAL',
            followed: false,
          }),
        ],
      },
      NOW,
    );

    expect(result.items.map((item) => [item.postId, item.rank])).toEqual([
      ['old', 1],
      ['new', 2],
    ]);
    expect(result.source).toBe('STRUCTURAL_ONLY');
    expect(result.candidateCount).toBe(2);
  });

  it('marks the list COLD_START when no personal post exists', () => {
    const result = scoring.rank(
      {
        personal: [],
        global: [
          buildFeedCandidate(buildRankingPost('g1'), {
            origin: 'GLOBAL',
            followed: false,
          }),
        ],
      },
      NOW,
    );

    expect(result.source).toBe('COLD_START');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.semanticScore).toBeNull();
  });

  it('postpones a fourth post of the same author behind another author', () => {
    const sameAuthor = [1, 2, 3, 4].map((index) =>
      buildFeedCandidate(
        buildRankingPost(`a${String(index)}`, {
          createdAt: new Date(NOW.getTime() - index * HOUR_MS),
        }),
      ),
    );
    const other = buildFeedCandidate(
      buildRankingPost('b1', {
        authorId: AUTHOR_B,
        createdAt: new Date(NOW.getTime() - 50 * HOUR_MS),
      }),
    );

    const result = scoring.rank(
      { personal: [...sameAuthor, other], global: [] },
      NOW,
    );

    expect(result.items.map((item) => item.postId)).toEqual([
      'a1',
      'a2',
      'a3',
      'b1',
      'a4',
    ]);
    expect(result.items[3]?.authorId).toBe(AUTHOR_B);
    expect(result.items[0]?.authorId).toBe(AUTHOR_A);
  });

  it('keeps at most the configured list size', () => {
    const small = new FeedScoringService(buildConfig({ feedListSize: 2 }));
    const result = small.rank(
      {
        personal: ['p1', 'p2', 'p3'].map((id) =>
          buildFeedCandidate(buildRankingPost(id)),
        ),
        global: [],
      },
      NOW,
    );

    expect(result.items).toHaveLength(2);
    expect(result.candidateCount).toBe(3);
  });
});
