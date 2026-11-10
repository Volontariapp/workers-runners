import { createMock } from '@volontariapp/testing';
import type { jest } from '@jest/globals';
import { JobMessagingType } from '@volontariapp/messaging';
import type { SocialEdgeApplyService } from '@volontariapp/domain-social';
import type { JobAuditRepository } from '@volontariapp/workers';
import type { FollowUserHandler } from '../../workers/handlers/follow-user.handler.js';
import type { SocialEdgeApplyHandler } from '../../workers/handlers/social-edge-apply.handler.js';

export const createMockSocialEdgeApplyService =
  (): jest.Mocked<SocialEdgeApplyService> => {
    return createMock<SocialEdgeApplyService>();
  };

export const createMockJobAuditRepository =
  (): jest.Mocked<JobAuditRepository> => {
    return createMock<JobAuditRepository>();
  };

export const createMockFollowUserHandler =
  (): jest.Mocked<FollowUserHandler> => {
    const mock = createMock<FollowUserHandler>();
    Object.defineProperty(mock, 'jobType', {
      value: JobMessagingType.FOLLOW_USER,
      writable: true,
    });
    return mock;
  };

export const createMockSocialEdgeApplyHandler =
  (): jest.Mocked<SocialEdgeApplyHandler> => {
    const mock = createMock<SocialEdgeApplyHandler>();
    Object.defineProperty(mock, 'jobType', {
      value: JobMessagingType.SOCIAL_EDGE_APPLY,
      writable: true,
    });
    return mock;
  };
