import 'reflect-metadata';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { FeedSignalService } from '../../scoring/feed-signal.service.js';
import {
  AUTHOR_A,
  AUTHOR_B,
  buildRankingPost,
} from '../factories/feed.factory.js';
import { NOW, USER_ID, buildConfig } from '../factories/ranking.factory.js';
import {
  createMockLikeLogService,
  createMockPostClient,
  createMockSocialFeedClient,
} from '../mocks/feed.mock.js';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('FeedSignalService (Unit)', () => {
  const social = createMockSocialFeedClient();
  const posts = createMockPostClient();
  const likeLog = createMockLikeLogService();
  let reconcileSpy: jest.SpiedFunction<typeof likeLog.reconcileWithGraph>;
  let graphLikesSpy: jest.SpiedFunction<typeof social.likedPostIds>;
  let listActiveSpy: jest.SpiedFunction<typeof likeLog.listActive>;
  let byIdsSpy: jest.SpiedFunction<typeof posts.byIds>;
  let service: FeedSignalService;

  beforeEach(() => {
    service = new FeedSignalService(social, posts, likeLog, buildConfig());
    graphLikesSpy = jest
      .spyOn(social, 'likedPostIds')
      .mockResolvedValue({ ids: ['liked'], complete: true });
    reconcileSpy = jest
      .spyOn(likeLog, 'reconcileWithGraph')
      .mockResolvedValue({ tombstoned: 1, backfilled: 0 });
    listActiveSpy = jest.spyOn(likeLog, 'listActive').mockResolvedValue([
      { postId: 'liked', occurredAt: new Date(NOW.getTime() - 2 * DAY_MS) },
      { postId: 'own', occurredAt: NOW },
    ]);
    jest
      .spyOn(posts, 'commentsByAuthor')
      .mockResolvedValue([{ postId: 'commented', createdAt: NOW }]);
    byIdsSpy = jest
      .spyOn(posts, 'byIds')
      .mockResolvedValue([
        buildRankingPost('liked'),
        buildRankingPost('own', { authorId: USER_ID }),
        buildRankingPost('commented', { authorId: AUTHOR_B }),
      ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('reconciles the like log with the graph before reading the active likes', async () => {
    await service.collect(USER_ID, NOW);

    expect(reconcileSpy).toHaveBeenCalledWith({
      userId: USER_ID,
      graphPostIds: ['liked'],
      graphIsComplete: true,
      fallbackAt: new Date(NOW.getTime() - 30 * DAY_MS),
    });
    const graphRead = graphLikesSpy.mock.invocationCallOrder[0] ?? 0;
    const reconcile = reconcileSpy.mock.invocationCallOrder[0] ?? 0;
    const activeRead = listActiveSpy.mock.invocationCallOrder[0] ?? 0;
    const authorsRead = byIdsSpy.mock.invocationCallOrder[0] ?? 0;
    expect(graphRead).toBeGreaterThan(0);
    expect(graphRead).toBeLessThan(reconcile);
    expect(reconcile).toBeLessThan(activeRead);
    expect(activeRead).toBeLessThan(authorsRead);
  });

  it('groups likes and comments by post author and ignores the own posts', async () => {
    const result = await service.collect(USER_ID, NOW);

    expect(result.signalsByAuthor.get(AUTHOR_A)).toEqual([
      { kind: 'LIKE', ageDays: 2 },
    ]);
    expect(result.signalsByAuthor.get(AUTHOR_B)).toEqual([
      { kind: 'COMMENT', ageDays: 0 },
    ]);
    expect(result.signalsByAuthor.has(USER_ID)).toBe(false);
    expect([...result.engagedPostIds].sort()).toEqual([
      'commented',
      'liked',
      'own',
    ]);
  });
});
