import 'reflect-metadata';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { of } from 'rxjs';
import { RELATIONSHIP_QUERY_SERVICE_NAME } from '@volontariapp/contracts-nest';
import { SocialFeedClient } from '../../clients/social-feed.client.js';
import { FeedCandidateService } from '../../scoring/feed-candidate.service.js';
import { buildIdsResponse } from '../factories/grpc.factory.js';
import {
  createMockClientGrpc,
  createMockInternalMetadata,
  createMockRelationshipService,
} from '../mocks/grpc.mock.js';
import {
  AUTHOR_A,
  AUTHOR_B,
  AUTHOR_C,
  buildRankingPost,
} from '../factories/feed.factory.js';
import {
  NOW,
  USER_ID,
  buildConfig,
  buildRankingEvent,
} from '../factories/ranking.factory.js';
import {
  createMockFeedSignals,
  createMockPostClient,
  createMockSocialFeedClient,
} from '../mocks/feed.mock.js';
import {
  createMockEventClient,
  createMockSocialClient,
} from '../mocks/ranking.mock.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const PAST_EVENT = '33333333-3333-4333-a333-333333333333';
const FUTURE_EVENT = '44444444-4444-4444-a444-444444444444';

describe('FeedCandidateService (Unit)', () => {
  const signals = createMockFeedSignals();
  const socialFeed = createMockSocialFeedClient();
  const socialRanking = createMockSocialClient();
  const events = createMockEventClient();
  const posts = createMockPostClient();
  let followedSpy: jest.SpiedFunction<typeof socialFeed.followedIds>;
  let blockedSpy: jest.SpiedFunction<typeof socialFeed.blockedIds>;
  let recentSpy: jest.SpiedFunction<typeof posts.recentByAuthors>;
  let globalSpy: jest.SpiedFunction<typeof posts.recentGlobal>;
  let byIdsSpy: jest.SpiedFunction<typeof posts.byIds>;
  let friendsSpy: jest.SpiedFunction<typeof socialFeed.friendIds>;

  const build = (overrides: Parameters<typeof buildConfig>[0] = {}) =>
    new FeedCandidateService(
      signals,
      socialFeed,
      socialRanking,
      events,
      posts,
      buildConfig(overrides),
    );

  beforeEach(() => {
    jest.spyOn(signals, 'collect').mockResolvedValue({
      signalsByAuthor: new Map(),
      engagedPostIds: new Set(),
    });
    followedSpy = jest.spyOn(socialFeed, 'followedIds').mockResolvedValue([]);
    blockedSpy = jest
      .spyOn(socialFeed, 'blockedIds')
      .mockResolvedValue(new Set());
    friendsSpy = jest
      .spyOn(socialFeed, 'friendIds')
      .mockResolvedValue(new Set());
    jest.spyOn(socialFeed, 'eventPostIds').mockResolvedValue([]);
    jest.spyOn(socialRanking, 'participatedEventIds').mockResolvedValue([]);
    jest.spyOn(socialRanking, 'wishedEventIds').mockResolvedValue([]);
    jest.spyOn(events, 'byIds').mockResolvedValue([]);
    recentSpy = jest.spyOn(posts, 'recentByAuthors').mockResolvedValue([]);
    globalSpy = jest.spyOn(posts, 'recentGlobal').mockResolvedValue([]);
    byIdsSpy = jest.spyOn(posts, 'byIds').mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('gives an account without follows, signals or events only the GLOBAL complement', async () => {
    globalSpy.mockResolvedValue([buildRankingPost('g1')]);

    const result = await build().collect(USER_ID, NOW);

    expect(result.personal).toEqual([]);
    expect(result.global.map((entry) => entry.origin)).toEqual(['GLOBAL']);
  });

  it('excludes an author who blocked the user, read from AdminGetWhoBlockedMe only', async () => {
    const relationship = createMockRelationshipService();
    jest
      .spyOn(relationship, 'adminGetMyFollows')
      .mockReturnValue(of(buildIdsResponse([AUTHOR_A, AUTHOR_B], 1)));
    const myBlocksSpy = jest
      .spyOn(relationship, 'adminGetMyBlocks')
      .mockReturnValue(of(buildIdsResponse([], 0)));
    const blockedMeSpy = jest
      .spyOn(relationship, 'adminGetWhoBlockedMe')
      .mockReturnValue(of(buildIdsResponse([AUTHOR_B], 1)));
    jest
      .spyOn(relationship, 'adminGetIsFollowing')
      .mockReturnValue(of({ isFollowing: false }));
    const realSocialFeed = new SocialFeedClient(
      createMockClientGrpc(
        new Map<string, object>([
          [RELATIONSHIP_QUERY_SERVICE_NAME, relationship],
        ]),
      ),
      createMockInternalMetadata(),
    );
    realSocialFeed.onModuleInit();
    recentSpy.mockResolvedValue([
      buildRankingPost('kept'),
      buildRankingPost('from-blocker', { authorId: AUTHOR_B }),
    ]);
    globalSpy.mockResolvedValue([
      buildRankingPost('global-from-blocker', { authorId: AUTHOR_B }),
    ]);

    const result = await new FeedCandidateService(
      signals,
      realSocialFeed,
      socialRanking,
      events,
      posts,
      buildConfig(),
    ).collect(USER_ID, NOW);

    expect(myBlocksSpy).toHaveBeenCalledTimes(1);
    expect(blockedMeSpy.mock.calls[0]?.[0].userId).toBe(USER_ID);
    expect(recentSpy.mock.calls[0]?.[0]).toEqual([AUTHOR_A]);
    expect(result.personal.map((entry) => entry.post.id)).toEqual(['kept']);
    expect(result.global).toEqual([]);
  });

  it('excludes the blocked authors, the own posts and pending media', async () => {
    followedSpy.mockResolvedValue([AUTHOR_A, AUTHOR_B]);
    blockedSpy.mockResolvedValue(new Set([AUTHOR_B]));
    recentSpy.mockResolvedValue([
      buildRankingPost('kept'),
      buildRankingPost('blocked', { authorId: AUTHOR_B }),
      buildRankingPost('mine', { authorId: USER_ID }),
      buildRankingPost('pending', { mediaVisible: false }),
    ]);
    globalSpy.mockResolvedValue([
      buildRankingPost('global-blocked', { authorId: AUTHOR_B }),
    ]);

    const result = await build().collect(USER_ID, NOW);

    expect(recentSpy.mock.calls[0]?.[0]).toEqual([AUTHOR_A]);
    expect(result.personal.map((entry) => entry.post.id)).toEqual(['kept']);
    expect(result.global).toEqual([]);
  });

  it('keeps an event-linked post up to 30 days but drops a plain post older than 7 days', async () => {
    followedSpy.mockResolvedValue([AUTHOR_A]);
    jest
      .spyOn(socialRanking, 'participatedEventIds')
      .mockResolvedValue([PAST_EVENT]);
    jest
      .spyOn(socialRanking, 'wishedEventIds')
      .mockResolvedValue([FUTURE_EVENT]);
    jest.spyOn(events, 'byIds').mockResolvedValue([
      buildRankingEvent(PAST_EVENT, {
        startAt: new Date(NOW.getTime() - 2 * DAY_MS),
      }),
      buildRankingEvent(FUTURE_EVENT),
    ]);
    jest
      .spyOn(socialFeed, 'eventPostIds')
      .mockImplementation((eventId) =>
        Promise.resolve(eventId === PAST_EVENT ? ['linked-old'] : ['wished']),
      );
    const tenDaysAgo = new Date(NOW.getTime() - 10 * DAY_MS);
    recentSpy.mockResolvedValue([
      buildRankingPost('plain-old', { createdAt: tenDaysAgo }),
    ]);
    byIdsSpy.mockResolvedValue([
      buildRankingPost('linked-old', {
        authorId: AUTHOR_C,
        createdAt: tenDaysAgo,
      }),
      buildRankingPost('wished', { authorId: AUTHOR_C }),
    ]);

    const result = await build({ feedMinItems: 0 }).collect(USER_ID, NOW);

    const byId = new Map(
      result.personal.map((entry) => [entry.post.id, entry]),
    );
    expect([...byId.keys()].sort()).toEqual(['linked-old', 'wished']);
    expect(byId.get('linked-old')?.eventTie).toBe('PAST_JOINED');
    expect(byId.get('wished')?.eventTie).toBe('FUTURE_WISHED');
    expect(byId.get('wished')?.origin).toBe('EVENT');
    expect(globalSpy).not.toHaveBeenCalled();
  });

  it('puts the engaged authors first, never proposes a post already liked or commented, and marks follows and friends', async () => {
    jest.spyOn(signals, 'collect').mockResolvedValue({
      signalsByAuthor: new Map([[AUTHOR_C, [{ kind: 'COMMENT', ageDays: 1 }]]]),
      engagedPostIds: new Set(['p-c']),
    });
    followedSpy.mockResolvedValue([AUTHOR_A]);
    friendsSpy.mockResolvedValue(new Set([AUTHOR_A]));
    recentSpy.mockResolvedValue([
      buildRankingPost('p-a'),
      buildRankingPost('p-c', { authorId: AUTHOR_C }),
      buildRankingPost('p-c2', { authorId: AUTHOR_C }),
    ]);

    const result = await build().collect(USER_ID, NOW);

    expect(recentSpy.mock.calls[0]?.[0]).toEqual([AUTHOR_C, AUTHOR_A]);
    expect(friendsSpy.mock.calls[0]?.[1]).toEqual([AUTHOR_A]);
    const byId = new Map(
      result.personal.map((entry) => [entry.post.id, entry]),
    );
    expect(byId.has('p-c')).toBe(false);
    expect(byId.get('p-c2')).toMatchObject({
      origin: 'ENGAGED',
      alreadyEngaged: false,
      followed: false,
    });
    expect(byId.get('p-a')).toMatchObject({
      origin: 'FOLLOWED',
      followed: true,
      friend: true,
    });
  });

  it('never proposes a post already liked or commented in the GLOBAL complement either', async () => {
    jest.spyOn(signals, 'collect').mockResolvedValue({
      signalsByAuthor: new Map(),
      engagedPostIds: new Set(['g-liked']),
    });
    globalSpy.mockResolvedValue([
      buildRankingPost('g-liked', { authorId: AUTHOR_B }),
      buildRankingPost('g-new', { authorId: AUTHOR_C }),
    ]);

    const result = await build().collect(USER_ID, NOW);

    expect(result.global.map((entry) => entry.post.id)).toEqual(['g-new']);
  });

  it('skips the GLOBAL complement when it is disabled', async () => {
    globalSpy.mockResolvedValue([buildRankingPost('g1')]);

    const result = await build({ feedGlobalEnabled: false }).collect(
      USER_ID,
      NOW,
    );

    expect(globalSpy).not.toHaveBeenCalled();
    expect(result.global).toEqual([]);
  });
});
