import 'reflect-metadata';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  FEED_FORMULA_VERSION,
  RankingListKind,
  type ReplaceListResult,
} from '@volontariapp/domain-ranking';
import { FeedScoringService } from '../../scoring/feed-scoring.service.js';
import { ComputeUserFeedHandler } from '../../workers/handlers/compute-user-feed.handler.js';
import {
  USER_ID,
  buildConfig,
  buildJob,
} from '../factories/ranking.factory.js';
import {
  createMockFeedCandidates,
  createMockPostScoreService,
} from '../mocks/feed.mock.js';
import {
  createMockJobWriter,
  createMockRequestService,
  createMockRunService,
} from '../mocks/ranking.mock.js';
import { createMockEntityManager } from '../mocks/transaction.mock.js';

const PAYLOAD = {
  userId: USER_ID,
  reason: 'POST_PUBLISHED' as const,
  requestedAt: '2026-10-19 10:00:00.5+00',
};
const STARTED_AT = '2026-10-19 10:00:01.123456+00';

describe('ComputeUserFeedHandler (Unit)', () => {
  const runService = createMockRunService();
  const requestService = createMockRequestService();
  const postScoreService = createMockPostScoreService();
  const candidates = createMockFeedCandidates();
  const jobWriter = createMockJobWriter();
  let handler: ComputeUserFeedHandler;
  let isUpToDateSpy: jest.SpiedFunction<typeof runService.isUpToDate>;
  let replaceListSpy: jest.SpiedFunction<typeof postScoreService.replaceList>;
  let collectSpy: jest.SpiedFunction<typeof candidates.collect>;
  let followUpSpy: jest.SpiedFunction<typeof jobWriter.insertFollowUp>;

  beforeEach(() => {
    handler = new ComputeUserFeedHandler(
      runService,
      requestService,
      postScoreService,
      candidates,
      new FeedScoringService(buildConfig()),
      jobWriter,
    );
    isUpToDateSpy = jest
      .spyOn(runService, 'isUpToDate')
      .mockResolvedValue(false);
    jest.spyOn(requestService, 'databaseClock').mockResolvedValue(STARTED_AT);
    collectSpy = jest
      .spyOn(candidates, 'collect')
      .mockResolvedValue({ personal: [], global: [] });
    replaceListSpy = jest
      .spyOn(postScoreService, 'replaceList')
      .mockResolvedValue({
        written: true,
        followUpRequired: false,
      } satisfies ReplaceListResult);
    followUpSpy = jest
      .spyOn(jobWriter, 'insertFollowUp')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('skips the job when a feed computed after the request already exists', async () => {
    isUpToDateSpy.mockResolvedValue(true);

    const result = await handler.handle(buildJob(PAYLOAD));

    expect(isUpToDateSpy).toHaveBeenCalledWith({
      userId: USER_ID,
      listKind: RankingListKind.POST,
      requestedAt: PAYLOAD.requestedAt,
      formulaVersion: FEED_FORMULA_VERSION,
    });
    expect(collectSpy).not.toHaveBeenCalled();
    expect(replaceListSpy).not.toHaveBeenCalled();
    expect(result.originalPayload).toBe(PAYLOAD);
  });

  it('writes a COLD_START feed for an account without any personal candidate', async () => {
    const result = await handler.handle(buildJob(PAYLOAD));

    const params = replaceListSpy.mock.calls[0]?.[0];
    expect(params.userId).toBe(USER_ID);
    expect(params.startedAt).toBe(STARTED_AT);
    expect(params.run.source).toBe('COLD_START');
    expect(params.run.formulaVersion).toBe(FEED_FORMULA_VERSION);
    expect(params.run.reason).toBe('POST_PUBLISHED');
    expect(params.run.jevScoredCount).toBe(0);
    expect(result.originalPayload).toBe(PAYLOAD);
    expect(followUpSpy).not.toHaveBeenCalled();
  });

  it('writes a POST follow-up job in the same transaction when a request arrived during the compute', async () => {
    const manager = createMockEntityManager();
    replaceListSpy.mockImplementation(async (_params, afterWrite) => {
      const result: ReplaceListResult = {
        written: true,
        followUpRequired: true,
        followUpRequestedAt: '2026-10-19 10:00:09.5+00',
      };
      await afterWrite?.(manager, result);
      return result;
    });

    await handler.handle(buildJob(PAYLOAD));

    expect(followUpSpy.mock.calls[0]?.[0]).toBe(manager);
    expect(followUpSpy.mock.calls[0]?.[1]).toEqual({
      userId: USER_ID,
      listKind: RankingListKind.POST,
      reason: 'POST_PUBLISHED',
      requestedAt: '2026-10-19 10:00:09.5+00',
    });
  });

  it('lets a gRPC error out so BullMQ retries and the old feed stays served', async () => {
    collectSpy.mockRejectedValue(new Error('ms-post unavailable'));

    await expect(handler.handle(buildJob(PAYLOAD))).rejects.toThrow(
      'ms-post unavailable',
    );
    expect(replaceListSpy).not.toHaveBeenCalled();
  });
});
