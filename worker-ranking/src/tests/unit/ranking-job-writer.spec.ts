import 'reflect-metadata';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import type { EntityManager, Repository } from 'typeorm';
import { JobsOutboxEntity, type JobsOutboxModel } from '@volontariapp/database';
import { JobsOutboxRepository } from '@volontariapp/outbox';
import { RankingListKind } from '@volontariapp/domain-ranking';
import { createMock } from '@volontariapp/testing';
import type { CustomConfig } from '../../config/custom-config.js';
import { RankingJobWriter } from '../../domain/ranking-job-writer.js';
import { createMockPostgresProvider } from '../mocks/postgres.mock.js';
import { createMockRequestService } from '../mocks/ranking.mock.js';

const USER = '11111111-1111-4111-a111-111111111111';
const REQUESTED_AT = '2026-10-19 10:00:00.123456+00';
const TRACEPARENT = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';

describe('RankingJobWriter (Unit)', () => {
  let manager: jest.Mocked<EntityManager>;
  let writer: RankingJobWriter;
  let createSpy: jest.SpiedFunction<JobsOutboxRepository['create']>;

  const makeJob = (traceparent?: string): JobsOutboxEntity =>
    JobsOutboxEntity.createJob({
      type: 'ranking.compute_user_ranking',
      emitter: 'ms-ranking',
      emitterId: USER,
      target: 'ranking-queue',
      payload: {
        userId: USER,
        reason: 'USER_CREATED',
        requestedAt: REQUESTED_AT,
      },
      traceparent,
    });

  beforeEach(() => {
    manager = createMock<EntityManager>();
    jest
      .spyOn(manager, 'getRepository')
      .mockReturnValue(createMock<Repository<JobsOutboxModel>>());
    createSpy = jest
      .spyOn(JobsOutboxRepository.prototype, 'create')
      .mockResolvedValue(makeJob());
    writer = new RankingJobWriter(
      createMockPostgresProvider(),
      createMockRequestService(),
      {
        ranking: { requestTtlSeconds: 120, debounceSeconds: 30 },
      } as CustomConfig,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores the trace context captured for the follow-up job in the persisted row', async () => {
    jest
      .spyOn(JobsOutboxEntity, 'createJob')
      .mockReturnValue(makeJob(TRACEPARENT));

    await writer.insertFollowUp(manager, {
      userId: USER,
      listKind: RankingListKind.EVENT,
      reason: 'USER_CREATED',
      requestedAt: REQUESTED_AT,
    });

    expect(createSpy.mock.calls[0]?.[0].traceparent).toBe(TRACEPARENT);
  });

  it('leaves the persisted traceparent empty when no trace context was captured', async () => {
    jest.spyOn(JobsOutboxEntity, 'createJob').mockReturnValue(makeJob());

    await writer.insertFollowUp(manager, {
      userId: USER,
      listKind: RankingListKind.EVENT,
      reason: 'USER_CREATED',
      requestedAt: REQUESTED_AT,
    });

    expect(createSpy.mock.calls[0]?.[0].traceparent).toBeUndefined();
  });
});
