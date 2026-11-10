import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType, SocialEdgeKind } from '@volontariapp/messaging';
import {
  SocialEdgeNodeMissingError,
  type SocialEdgeApplyService,
} from '@volontariapp/domain-social';
import { SocialEdgeApplyHandler } from '../../workers/handlers/social-edge-apply.handler.js';
import {
  SOCIAL_EDGE_JOB_ID,
  SOCIAL_EDGE_TRACEPARENT,
  buildSocialEdgeApplyJob,
  buildSocialEdgeApplyPayload,
} from '../factories/social-edge-apply-job.factory.js';
import { createMockSocialEdgeApplyService } from '../mocks/social.mock.js';

describe('SocialEdgeApplyHandler (Unit)', () => {
  let applyService: jest.Mocked<SocialEdgeApplyService>;
  let handler: SocialEdgeApplyHandler;
  let warnSpy: jest.SpiedFunction<Logger['warn']>;
  let errorSpy: jest.SpiedFunction<Logger['error']>;

  beforeEach(() => {
    applyService = createMockSocialEdgeApplyService();
    handler = new SocialEdgeApplyHandler(applyService);
    jest.spyOn(Logger.prototype, 'info').mockImplementation(() => undefined);
    warnSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should declare the SOCIAL_EDGE_APPLY job type', () => {
    expect(handler.jobType).toBe(JobMessagingType.SOCIAL_EDGE_APPLY);
  });

  it('should call apply with the payload, the job id and the traceparent', async () => {
    const payload = buildSocialEdgeApplyPayload({
      kind: SocialEdgeKind.PARTICIPATE,
      companionKind: SocialEdgeKind.WISH,
    });
    const job = buildSocialEdgeApplyJob({
      payload,
      traceparent: SOCIAL_EDGE_TRACEPARENT,
    });
    applyService.apply.mockResolvedValue({ eventId: 'event-1' });

    const result = await handler.handle(job);

    expect(applyService.apply).toHaveBeenCalledTimes(1);
    expect(applyService.apply).toHaveBeenCalledWith(payload, {
      jobId: SOCIAL_EDGE_JOB_ID,
      traceparent: SOCIAL_EDGE_TRACEPARENT,
    });
    expect(result).toEqual({ originalPayload: payload });
  });

  it('should pass an absent traceparent through as undefined', async () => {
    const job = buildSocialEdgeApplyJob();
    applyService.apply.mockResolvedValue({});

    await handler.handle(job);

    expect(applyService.apply).toHaveBeenCalledWith(
      job.data.payload,
      expect.objectContaining({
        jobId: SOCIAL_EDGE_JOB_ID,
        traceparent: undefined,
      }),
    );
  });

  it('should rethrow a missing node error so BullMQ retries, logged as a warning', async () => {
    const payload = buildSocialEdgeApplyPayload();
    const error = new SocialEdgeNodeMissingError(
      payload.kind,
      payload.fromId,
      payload.toId,
    );
    applyService.apply.mockRejectedValue(error);

    await expect(
      handler.handle(buildSocialEdgeApplyJob({ payload, attemptsMade: 2 })),
    ).rejects.toBe(error);

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should rethrow a transient error so BullMQ retries, logged as an error', async () => {
    const error = new Error('Neo4j unavailable');
    applyService.apply.mockRejectedValue(error);

    await expect(handler.handle(buildSocialEdgeApplyJob())).rejects.toBe(error);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('should fail without calling apply when the job has no id', async () => {
    const job = buildSocialEdgeApplyJob({ id: undefined });

    await expect(handler.handle(job)).rejects.toThrow(
      'SOCIAL_EDGE_APPLY job has no id',
    );
    expect(applyService.apply).not.toHaveBeenCalled();
  });
});
