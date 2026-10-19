import 'reflect-metadata';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { RankingListKind } from '@volontariapp/domain-ranking';
import { FanoutRankingHandler } from '../../workers/handlers/fanout-ranking.handler.js';
import { buildConfig, buildJob } from '../factories/ranking.factory.js';
import {
  createMockJobWriter,
  createMockRunService,
  createMockSocialClient,
} from '../mocks/ranking.mock.js';

const EVENT = '22222222-2222-4222-a222-222222222222';
const REQUESTED_AT = '2026-10-19 10:00:00.5+00';

describe('FanoutRankingHandler (Unit)', () => {
  const runService = createMockRunService();
  const social = createMockSocialClient();
  const jobWriter = createMockJobWriter();
  let handler: FanoutRankingHandler;
  let activeUsersSpy: jest.SpiedFunction<typeof runService.listActiveUsers>;
  let requestSpy: jest.SpiedFunction<typeof jobWriter.requestCompute>;

  const build = (maxFanout: number) =>
    new FanoutRankingHandler(
      runService,
      social,
      jobWriter,
      buildConfig({ maxFanout }),
    );

  beforeEach(() => {
    handler = build(1000);
    activeUsersSpy = jest
      .spyOn(runService, 'listActiveUsers')
      .mockResolvedValue([]);
    requestSpy = jest
      .spyOn(jobWriter, 'requestCompute')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('asks one event refresh per active user for a created event', async () => {
    activeUsersSpy.mockResolvedValue([
      { userId: 'u1', computedAt: '2026-10-19T09:00:00Z' },
      { userId: 'u2', computedAt: '2026-10-19T08:00:00Z' },
    ]);
    const payload = {
      trigger: 'EVENT_CREATED' as const,
      eventId: EVENT,
      requestedAt: REQUESTED_AT,
    };

    const result = await handler.handle(buildJob(payload));

    expect(requestSpy.mock.calls[0]?.[0]).toEqual([
      {
        userId: 'u1',
        listKind: RankingListKind.EVENT,
        reason: 'EVENT_CREATED',
      },
      {
        userId: 'u2',
        listKind: RankingListKind.EVENT,
        reason: 'EVENT_CREATED',
      },
    ]);
    expect(result.originalPayload).toBe(payload);
  });

  it('caps the created-event fan-out at the maximal fan-out', async () => {
    handler = build(3);
    activeUsersSpy.mockResolvedValue([
      { userId: 'u1', computedAt: 'a' },
      { userId: 'u2', computedAt: 'b' },
      { userId: 'u3', computedAt: 'c' },
    ]);

    await handler.handle(
      buildJob({
        trigger: 'EVENT_CREATED',
        eventId: EVENT,
        requestedAt: REQUESTED_AT,
      }),
    );

    expect(activeUsersSpy.mock.calls[0]?.[0].limit).toBe(3);
    expect(requestSpy.mock.calls[0]?.[0]).toHaveLength(3);
  });

  it('asks a refresh for every participant of a finished event, without cap', async () => {
    const participantsSpy = jest
      .spyOn(social, 'eventParticipantIds')
      .mockResolvedValue(['u1', 'u2', 'u3']);

    await handler.handle(
      buildJob({
        trigger: 'EVENT_FINISHED',
        eventId: EVENT,
        requestedAt: REQUESTED_AT,
      }),
    );

    expect(participantsSpy).toHaveBeenCalledWith(EVENT);
    expect(
      requestSpy.mock.calls[0]?.[0].map((request) => request.reason),
    ).toEqual(['EVENT_FINISHED', 'EVENT_FINISHED', 'EVENT_FINISHED']);
  });

  it('writes nothing when nobody is concerned', async () => {
    await handler.handle(
      buildJob({
        trigger: 'EVENT_CREATED',
        eventId: EVENT,
        requestedAt: REQUESTED_AT,
      }),
    );

    expect(requestSpy).not.toHaveBeenCalled();
  });

  it('leaves the post fan-out to the feed worker', async () => {
    const payload = {
      trigger: 'POST_CREATED' as const,
      postId: 'p',
      requestedAt: REQUESTED_AT,
    };

    const result = await handler.handle(buildJob(payload));

    expect(requestSpy).not.toHaveBeenCalled();
    expect(result.originalPayload).toBe(payload);
  });

  it('ignores a finished event without id', async () => {
    await handler.handle(
      buildJob({ trigger: 'EVENT_FINISHED', requestedAt: REQUESTED_AT }),
    );

    expect(requestSpy).not.toHaveBeenCalled();
  });
});
