import { beforeEach, describe, expect, it } from '@jest/globals';
import type { jest } from '@jest/globals';
import type { JobAuditRepository } from '@volontariapp/workers';
import { SocialWorker } from '../../workers/social.worker.js';
import type { FollowUserHandler } from '../../workers/handlers/follow-user.handler.js';
import type { SocialEdgeApplyHandler } from '../../workers/handlers/social-edge-apply.handler.js';
import {
  buildSocialEdgeApplyJob,
  buildUnknownJob,
} from '../factories/social-edge-apply-job.factory.js';
import {
  createMockFollowUserHandler,
  createMockJobAuditRepository,
  createMockSocialEdgeApplyHandler,
} from '../mocks/social.mock.js';

describe('SocialWorker (Unit)', () => {
  let auditRepo: jest.Mocked<JobAuditRepository>;
  let followHandler: jest.Mocked<FollowUserHandler>;
  let edgeApplyHandler: jest.Mocked<SocialEdgeApplyHandler>;
  let worker: SocialWorker;

  beforeEach(() => {
    auditRepo = createMockJobAuditRepository();
    followHandler = createMockFollowUserHandler();
    edgeApplyHandler = createMockSocialEdgeApplyHandler();
    worker = new SocialWorker(auditRepo, followHandler, edgeApplyHandler);
  });

  it('should route social.edge_apply to SocialEdgeApplyHandler', async () => {
    const job = buildSocialEdgeApplyJob();
    edgeApplyHandler.handle.mockResolvedValue({
      originalPayload: job.data.payload,
    });

    const result = await worker['processJob'](job);

    expect(edgeApplyHandler.handle).toHaveBeenCalledWith(job);
    expect(followHandler.handle).not.toHaveBeenCalled();
    expect(result).toEqual({ originalPayload: job.data.payload });
  });

  it('should propagate a handler failure so BaseWorker marks the attempt failed', async () => {
    const error = new Error('Neo4j unavailable');
    edgeApplyHandler.handle.mockRejectedValue(error);

    await expect(worker['processJob'](buildSocialEdgeApplyJob())).rejects.toBe(
      error,
    );
  });

  it('should not take an unknown job type', async () => {
    await expect(worker['processJob'](buildUnknownJob())).rejects.toThrow(
      'Unhandled job type: unknown.job',
    );
    expect(edgeApplyHandler.handle).not.toHaveBeenCalled();
    expect(followHandler.handle).not.toHaveBeenCalled();
  });
});
