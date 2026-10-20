import 'reflect-metadata';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { FORMULA_VERSION, RankingListKind } from '@volontariapp/domain-ranking';
import type {
  RankedEventItem,
  ReplaceListResult,
} from '@volontariapp/domain-ranking';
import { ComputeUserRankingHandler } from '../../workers/handlers/compute-user-ranking.handler.js';
import { USER_ID, buildJob } from '../factories/ranking.factory.js';
import {
  createMockCandidates,
  createMockJobWriter,
  createMockRequestService,
  createMockRunService,
  createMockScoreService,
  createMockScoring,
} from '../mocks/ranking.mock.js';
import { createMockEntityManager } from '../mocks/transaction.mock.js';

const PAYLOAD = {
  userId: USER_ID,
  reason: 'WISH_CHANGED' as const,
  requestedAt: '2026-10-19 10:00:00.5+00',
};
const STARTED_AT = '2026-10-19 10:00:01.123456+00';
const ITEM: RankedEventItem = {
  eventId: '22222222-2222-4222-a222-222222222222',
  score: 0.8,
  structuralScore: 0.8,
  semanticScore: null,
  rank: 1,
  reasons: ['NEAR_YOU'],
};

describe('ComputeUserRankingHandler (Unit)', () => {
  const runService = createMockRunService();
  const requestService = createMockRequestService();
  const scoreService = createMockScoreService();
  const candidates = createMockCandidates();
  const scoring = createMockScoring();
  const jobWriter = createMockJobWriter();
  let handler: ComputeUserRankingHandler;
  let isUpToDateSpy: jest.SpiedFunction<typeof runService.isUpToDate>;
  let replaceListSpy: jest.SpiedFunction<typeof scoreService.replaceList>;
  let collectSpy: jest.SpiedFunction<typeof candidates.collect>;
  let followUpSpy: jest.SpiedFunction<typeof jobWriter.insertFollowUp>;

  beforeEach(() => {
    handler = new ComputeUserRankingHandler(
      runService,
      requestService,
      scoreService,
      candidates,
      scoring,
      jobWriter,
    );
    isUpToDateSpy = jest
      .spyOn(runService, 'isUpToDate')
      .mockResolvedValue(false);
    jest.spyOn(requestService, 'databaseClock').mockResolvedValue(STARTED_AT);
    collectSpy = jest.spyOn(candidates, 'collect').mockResolvedValue({
      candidates: [],
      history: [],
      friendTouched: new Set(),
      origin: null,
    });
    jest.spyOn(scoring, 'rank').mockResolvedValue({
      items: [ITEM],
      source: 'STRUCTURAL_ONLY',
      candidateCount: 1,
      semanticScoredCount: 0,
    });
    replaceListSpy = jest.spyOn(scoreService, 'replaceList').mockResolvedValue({
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

  it('skips the job when a list computed after the request already exists', async () => {
    isUpToDateSpy.mockResolvedValue(true);

    const result = await handler.handle(buildJob(PAYLOAD));

    expect(isUpToDateSpy).toHaveBeenCalledWith({
      userId: USER_ID,
      listKind: RankingListKind.EVENT,
      requestedAt: PAYLOAD.requestedAt,
      formulaVersion: FORMULA_VERSION,
    });
    expect(collectSpy).not.toHaveBeenCalled();
    expect(replaceListSpy).not.toHaveBeenCalled();
    expect(result.originalPayload).toBe(PAYLOAD);
  });

  it('writes the list with the database clock and a structural-only run, then returns the payload', async () => {
    const result = await handler.handle(buildJob(PAYLOAD));

    const params = replaceListSpy.mock.calls[0]?.[0];
    expect(params.userId).toBe(USER_ID);
    expect(params.startedAt).toBe(STARTED_AT);
    expect(params.items).toEqual([ITEM]);
    expect(params.run.source).toBe('STRUCTURAL_ONLY');
    expect(params.run.formulaVersion).toBe(FORMULA_VERSION);
    expect(params.run.reason).toBe('WISH_CHANGED');
    expect(result.originalPayload).toBe(PAYLOAD);
    expect(followUpSpy).not.toHaveBeenCalled();
    expect(collectSpy.mock.calls[0]?.[0]).toBe(USER_ID);
  });

  it('writes a follow-up job in the same transaction when a request arrived during the compute', async () => {
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

    expect(followUpSpy).toHaveBeenCalledTimes(1);
    expect(followUpSpy.mock.calls[0]?.[0]).toBe(manager);
    expect(followUpSpy.mock.calls[0]?.[1]).toEqual({
      userId: USER_ID,
      listKind: RankingListKind.EVENT,
      reason: 'WISH_CHANGED',
      requestedAt: '2026-10-19 10:00:09.5+00',
    });
  });

  it('lets the error out so BullMQ retries when the write fails', async () => {
    replaceListSpy.mockRejectedValue(new Error('database down'));

    await expect(handler.handle(buildJob(PAYLOAD))).rejects.toThrow(
      'database down',
    );
  });
});
