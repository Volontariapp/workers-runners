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
  POST_SERVICE_NAME,
  PostMediaStatus,
  type ListPostsByIdsQuery,
} from '@volontariapp/contracts-nest';
import { PostRankingClient } from '../../clients/post-ranking.client.js';
import {
  buildGrpcComment,
  buildGrpcPost,
  buildIds,
} from '../factories/grpc.factory.js';
import { NOW, USER_ID } from '../factories/ranking.factory.js';
import {
  createMockClientGrpc,
  createMockInternalMetadata,
  createMockPostService,
} from '../mocks/grpc.mock.js';

describe('PostRankingClient (Unit)', () => {
  const posts = createMockPostService();
  let client: PostRankingClient;
  let byIdsSpy: jest.SpiedFunction<typeof posts.listPostsByIds>;

  beforeEach(() => {
    client = new PostRankingClient(
      createMockClientGrpc(
        new Map<string, object>([[POST_SERVICE_NAME, posts]]),
      ),
      createMockInternalMetadata(),
    );
    client.onModuleInit();
    byIdsSpy = jest
      .spyOn(posts, 'listPostsByIds')
      .mockImplementation((request: ListPostsByIdsQuery) =>
        of({ posts: request.ids.map((id) => buildGrpcPost(id)) }),
      );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('reads the posts by batches of 100 distinct ids', async () => {
    const ids = buildIds('p', 250);

    const result = await client.byIds([...ids, 'p0']);

    expect(byIdsSpy.mock.calls.map(([request]) => request.ids.length)).toEqual([
      100, 100, 50,
    ]);
    expect(result).toHaveLength(250);
  });

  it('calls nothing for an empty list', async () => {
    expect(await client.byIds([])).toEqual([]);
    expect(byIdsSpy).not.toHaveBeenCalled();
  });

  it('keeps only NONE and READY media as visible and drops the posts without date', async () => {
    byIdsSpy.mockReturnValue(
      of({
        posts: [
          buildGrpcPost('none'),
          buildGrpcPost('ready', {
            mediaStatus: PostMediaStatus.POST_MEDIA_STATUS_READY,
          }),
          buildGrpcPost('pending', {
            mediaStatus: PostMediaStatus.POST_MEDIA_STATUS_PENDING,
          }),
          buildGrpcPost('rejected', {
            mediaStatus: PostMediaStatus.POST_MEDIA_STATUS_REJECTED,
          }),
          buildGrpcPost('undated', { createdAt: undefined }),
        ],
      }),
    );

    const result = await client.byIds(['x']);

    expect(result.map((post) => [post.id, post.mediaVisible])).toEqual([
      ['none', true],
      ['ready', true],
      ['pending', false],
      ['rejected', false],
    ]);
    expect(result[0]?.createdAt).toEqual(NOW);
  });

  it('asks the recent posts of the authors with 5 per author and the 300 cap', async () => {
    const recentSpy = jest
      .spyOn(posts, 'listRecentPostsByAuthors')
      .mockReturnValue(of({ posts: [buildGrpcPost('p1')] }));

    const result = await client.recentByAuthors(['a1'], NOW);

    expect(result.map((post) => post.id)).toEqual(['p1']);
    expect(recentSpy.mock.calls[0]?.[0]).toMatchObject({
      authorIds: ['a1'],
      allAuthors: false,
      perAuthorLimit: 5,
      limit: 300,
    });
  });

  it('skips the call when there is no author, and reads everyone for the GLOBAL complement', async () => {
    const recentSpy = jest
      .spyOn(posts, 'listRecentPostsByAuthors')
      .mockReturnValue(of({ posts: [] }));

    expect(await client.recentByAuthors([], NOW)).toEqual([]);
    expect(recentSpy).not.toHaveBeenCalled();

    await client.recentGlobal(NOW);
    expect(recentSpy.mock.calls[0]?.[0]).toMatchObject({
      authorIds: [],
      allAuthors: true,
    });
  });

  it('maps the comments and drops those without date', async () => {
    const commentsSpy = jest
      .spyOn(posts, 'listCommentsByAuthor')
      .mockReturnValue(
        of({
          comments: [
            buildGrpcComment('p1'),
            buildGrpcComment('p2', { createdAt: undefined }),
          ],
        }),
      );

    const result = await client.commentsByAuthor(USER_ID, NOW);

    expect(result).toEqual([{ postId: 'p1', createdAt: NOW }]);
    expect(commentsSpy.mock.calls[0]?.[0]).toMatchObject({
      authorId: USER_ID,
      limit: 200,
    });
  });
});
