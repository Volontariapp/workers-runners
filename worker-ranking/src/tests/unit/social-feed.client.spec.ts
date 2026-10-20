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
import {
  EVENT_POST_LINK_QUERY_SERVICE_NAME,
  INTERACTION_QUERY_SERVICE_NAME,
  RELATIONSHIP_QUERY_SERVICE_NAME,
} from '@volontariapp/contracts-nest';
import { SocialFeedClient } from '../../clients/social-feed.client.js';
import { AUTHOR_A, AUTHOR_B, AUTHOR_C } from '../factories/feed.factory.js';
import { buildIds, buildIdsResponse } from '../factories/grpc.factory.js';
import { USER_ID } from '../factories/ranking.factory.js';
import {
  createMockClientGrpc,
  createMockEventPostLinkService,
  createMockInteractionService,
  createMockInternalMetadata,
  createMockRelationshipService,
} from '../mocks/grpc.mock.js';

const EVENT = '22222222-2222-4222-a222-222222222222';

describe('SocialFeedClient (Unit)', () => {
  const relationship = createMockRelationshipService();
  const interaction = createMockInteractionService();
  const eventPostLink = createMockEventPostLinkService();
  let client: SocialFeedClient;
  let likesSpy: jest.SpiedFunction<typeof interaction.adminGetUserLikes>;

  beforeEach(() => {
    client = new SocialFeedClient(
      createMockClientGrpc(
        new Map<string, object>([
          [RELATIONSHIP_QUERY_SERVICE_NAME, relationship],
          [INTERACTION_QUERY_SERVICE_NAME, interaction],
          [EVENT_POST_LINK_QUERY_SERVICE_NAME, eventPostLink],
        ]),
      ),
      createMockInternalMetadata(),
    );
    client.onModuleInit();
    likesSpy = jest.spyOn(interaction, 'adminGetUserLikes');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('likedPostIds', () => {
    it('is complete when the whole graph read fits on one full page', async () => {
      likesSpy.mockReturnValue(of(buildIdsResponse(buildIds('p', 50), 1)));

      const result = await client.likedPostIds(USER_ID, 200);

      expect(result.ids).toHaveLength(50);
      expect(result.complete).toBe(true);
      expect(likesSpy).toHaveBeenCalledTimes(1);
      expect(likesSpy.mock.calls[0]?.[0]).toEqual({
        userId: USER_ID,
        pagination: { page: 1, limit: 50 },
      });
    });

    it('is complete for a single partial page', async () => {
      likesSpy.mockReturnValue(of(buildIdsResponse(['p1', 'p2'], 1)));

      const result = await client.likedPostIds(USER_ID, 200);

      expect(result).toEqual({ ids: ['p1', 'p2'], complete: true });
    });

    it('is complete for an empty graph', async () => {
      likesSpy.mockReturnValue(of(buildIdsResponse([], 0)));

      const result = await client.likedPostIds(USER_ID, 200);

      expect(result).toEqual({ ids: [], complete: true });
    });

    it('is never complete when the read spans several pages, even read to the end', async () => {
      likesSpy
        .mockReturnValueOnce(of(buildIdsResponse(buildIds('a', 50), 2, 1)))
        .mockReturnValueOnce(of(buildIdsResponse(['b1'], 2, 2)));

      const result = await client.likedPostIds(USER_ID, 200);

      expect(result.ids).toHaveLength(51);
      expect(result.complete).toBe(false);
      expect(likesSpy).toHaveBeenCalledTimes(2);
    });

    it('is not complete when the cap cuts the read', async () => {
      likesSpy.mockReturnValue(of(buildIdsResponse(buildIds('p', 50), 1)));

      const result = await client.likedPostIds(USER_ID, 10);

      expect(result.ids).toHaveLength(10);
      expect(result.complete).toBe(false);
    });
  });

  it('merges the accounts I blocked and the accounts that blocked me', async () => {
    const blocksSpy = jest
      .spyOn(relationship, 'adminGetMyBlocks')
      .mockReturnValue(of(buildIdsResponse([AUTHOR_A], 1)));
    const blockedMeSpy = jest
      .spyOn(relationship, 'adminGetWhoBlockedMe')
      .mockReturnValue(of(buildIdsResponse([AUTHOR_B, AUTHOR_A], 1)));

    const result = await client.blockedIds(USER_ID, 500);

    expect([...result].sort()).toEqual([AUTHOR_A, AUTHOR_B].sort());
    expect(blocksSpy.mock.calls[0]?.[0].userId).toBe(USER_ID);
    expect(blockedMeSpy.mock.calls[0]?.[0].userId).toBe(USER_ID);
  });

  it('asks whether each followed author follows the user back (author to user)', async () => {
    const isFollowingSpy = jest
      .spyOn(relationship, 'adminGetIsFollowing')
      .mockImplementation((request) =>
        of({ isFollowing: request.followerId === AUTHOR_B }),
      );

    const friends = await client.friendIds(USER_ID, [
      AUTHOR_A,
      AUTHOR_B,
      AUTHOR_C,
    ]);

    expect([...friends]).toEqual([AUTHOR_B]);
    expect(isFollowingSpy.mock.calls.map(([request]) => request)).toEqual([
      { followerId: AUTHOR_A, followedId: USER_ID },
      { followerId: AUTHOR_B, followedId: USER_ID },
      { followerId: AUTHOR_C, followedId: USER_ID },
    ]);
  });

  it('pages the follows by 50 up to the cap', async () => {
    const followsSpy = jest
      .spyOn(relationship, 'adminGetMyFollows')
      .mockReturnValueOnce(of(buildIdsResponse(buildIds('a', 50), 3, 1)))
      .mockReturnValueOnce(of(buildIdsResponse(buildIds('b', 50), 3, 2)));

    const result = await client.followedIds(USER_ID, 80);

    expect(result).toHaveLength(80);
    expect(followsSpy).toHaveBeenCalledTimes(2);
    expect(followsSpy.mock.calls[1]?.[0].pagination).toEqual({
      page: 2,
      limit: 50,
    });
  });

  it('reads one page of 50 posts for a linked event', async () => {
    const eventPostsSpy = jest
      .spyOn(eventPostLink, 'getEventPosts')
      .mockReturnValue(of(buildIdsResponse(['p1'], 1)));

    expect(await client.eventPostIds(EVENT)).toEqual(['p1']);
    expect(eventPostsSpy.mock.calls[0]?.[0]).toEqual({
      eventId: EVENT,
      pagination: { page: 1, limit: 50 },
    });
  });
});
