import { createMock } from '@volontariapp/testing';
import type { JobOf } from '@volontariapp/workers';
import {
  JobMessagingType,
  SocialEdgeAction,
  SocialEdgeKind,
  type ISocialEdgeApplyPayload,
} from '@volontariapp/messaging';

export const SOCIAL_EDGE_JOB_ID = '3f2b1c0e-6d4a-4f1b-9a57-2c8e5d7b9a10';
export const SOCIAL_EDGE_TRACEPARENT =
  '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';

export const buildSocialEdgeApplyPayload = (
  overrides: Partial<ISocialEdgeApplyPayload> = {},
): ISocialEdgeApplyPayload => ({
  kind: SocialEdgeKind.LIKE,
  fromId: '11111111-1111-4111-a111-111111111111',
  toId: '22222222-2222-4222-a222-222222222222',
  action: SocialEdgeAction.ADD,
  intentAt: '2026-11-10T12:00:00.000Z',
  ...overrides,
});

interface SocialEdgeApplyJobOptions {
  id?: string | undefined;
  traceparent?: string | undefined;
  attemptsMade?: number;
  payload?: ISocialEdgeApplyPayload;
}

export const buildSocialEdgeApplyJob = (
  options: SocialEdgeApplyJobOptions = {},
): JobOf<typeof JobMessagingType.SOCIAL_EDGE_APPLY> => {
  const job = createMock<JobOf<typeof JobMessagingType.SOCIAL_EDGE_APPLY>>();
  const hasId = 'id' in options;
  Object.defineProperty(job, 'id', {
    value: hasId ? options.id : SOCIAL_EDGE_JOB_ID,
    writable: true,
  });
  Object.defineProperty(job, 'name', {
    value: JobMessagingType.SOCIAL_EDGE_APPLY,
    writable: true,
  });
  Object.defineProperty(job, 'attemptsMade', {
    value: options.attemptsMade ?? 0,
    writable: true,
  });
  Object.defineProperty(job, 'data', {
    value: {
      payload: options.payload ?? buildSocialEdgeApplyPayload(),
      emitter: 'ms-social',
      emitterId: '11111111-1111-4111-a111-111111111111',
      traceparent: options.traceparent,
    },
    writable: true,
  });
  Object.defineProperty(job, Symbol.iterator, { value: undefined });
  return job;
};

export const buildUnknownJob = (): JobOf<JobMessagingType> => {
  const job = createMock<JobOf<JobMessagingType>>();
  Object.defineProperty(job, 'id', { value: 'job-unknown', writable: true });
  Object.defineProperty(job, 'name', { value: 'unknown.job', writable: true });
  Object.defineProperty(job, Symbol.iterator, { value: undefined });
  return job;
};
