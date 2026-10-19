import 'reflect-metadata';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { EventScoringService } from '../../scoring/event-scoring.service.js';
import type { CollectedEvents } from '../../scoring/interfaces/collected-events.interface.js';
import {
  NOW,
  PARIS,
  buildConfig,
  buildRankingEvent,
} from '../factories/ranking.factory.js';
import {
  createMockFeedbackService,
  createMockMentionService,
  createMockScorer,
  createMockWishService,
} from '../mocks/ranking.mock.js';

const collected = (overrides: Partial<CollectedEvents>): CollectedEvents => ({
  candidates: [],
  history: [],
  friendTouched: new Set(),
  origin: PARIS,
  ...overrides,
});

describe('EventScoringService (Unit)', () => {
  const wishService = createMockWishService();
  const feedbackService = createMockFeedbackService();
  const mentionService = createMockMentionService();
  const scorer = createMockScorer();
  let service: EventScoringService;
  let scoreSpy: jest.SpiedFunction<typeof scorer.score>;

  beforeEach(() => {
    service = new EventScoringService(
      wishService,
      feedbackService,
      mentionService,
      scorer,
      buildConfig({ listSize: 2 }),
    );
    jest.spyOn(wishService, 'countByEvents').mockResolvedValue(new Map());
    jest.spyOn(feedbackService, 'countPasses').mockResolvedValue(new Map());
    jest
      .spyOn(mentionService, 'countDistinctAuthors')
      .mockResolvedValue(new Map());
    scoreSpy = jest.spyOn(scorer, 'score').mockResolvedValue(new Map());
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('ranks by score, keeps the list size and reports a structural-only run without Jev', async () => {
    const near = buildRankingEvent('near');
    const far = buildRankingEvent('far', {
      location: { lat: 48.6, lng: 2.9 },
    });
    const nearer = buildRankingEvent('nearer', {
      location: { lat: 48.86, lng: 2.35 },
    });

    const list = await service.rank(
      collected({ candidates: [far, near, nearer] }),
      NOW,
    );

    expect(list.source).toBe('STRUCTURAL_ONLY');
    expect(list.semanticScoredCount).toBe(0);
    expect(list.items).toHaveLength(2);
    expect(list.items.map((item) => item.rank)).toEqual([1, 2]);
    expect(list.items[0]?.score).toBeGreaterThanOrEqual(
      list.items[1]?.score ?? 0,
    );
    expect(list.items.every((item) => item.semanticScore === null)).toBe(true);
    expect(list.candidateCount).toBe(3);
  });

  it('drops an event beyond the maximal distance', async () => {
    const remote = buildRankingEvent('remote', {
      location: { lat: 40.4168, lng: -3.7038 },
    });

    const list = await service.rank(collected({ candidates: [remote] }), NOW);

    expect(list.items).toEqual([]);
    expect(list.candidateCount).toBe(0);
  });

  it('keeps an event of unknown position with a neutral proximity', async () => {
    const list = await service.rank(
      collected({
        candidates: [buildRankingEvent('unknown', { location: null })],
        origin: null,
      }),
      NOW,
    );

    expect(list.items).toHaveLength(1);
  });

  it('puts an event touched by a friend above an identical one', async () => {
    const friend = buildRankingEvent('friend');
    const other = buildRankingEvent('other');

    const list = await service.rank(
      collected({
        candidates: [other, friend],
        friendTouched: new Set(['friend']),
      }),
      NOW,
    );

    expect(list.items[0]?.eventId).toBe('friend');
    expect(list.items[0]?.reasons).toContain('FRIEND_INVOLVED');
  });

  it('blends the semantic score when the scorer answers and flags a full run', async () => {
    scoreSpy.mockResolvedValue(new Map([['near', 1]]));

    const list = await service.rank(
      collected({ candidates: [buildRankingEvent('near')] }),
      NOW,
    );

    expect(list.source).toBe('FULL');
    expect(list.items[0]?.semanticScore).toBe(1);
    expect(list.semanticScoredCount).toBe(1);
  });

  it('falls back to the structural list when the scorer fails', async () => {
    scoreSpy.mockRejectedValue(new Error('Jev unavailable'));

    const list = await service.rank(
      collected({ candidates: [buildRankingEvent('near')] }),
      NOW,
    );

    expect(list.source).toBe('STRUCTURAL_ONLY');
    expect(list.items).toHaveLength(1);
  });

  it('uses a position far from Paris to drop the Paris events', async () => {
    const list = await service.rank(
      collected({
        candidates: [buildRankingEvent('paris')],
        origin: { lat: -33.8688, lng: 151.2093 },
      }),
      NOW,
    );

    expect(list.items).toEqual([]);
  });
});
