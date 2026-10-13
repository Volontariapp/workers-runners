import { createMock } from '@volontariapp/testing';
import type {
  IFallbackDeleteEventJobPayload,
  JobMessagingType,
} from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';

export const createFallbackDeleteEventJobMock = (
  payload: Partial<IFallbackDeleteEventJobPayload> &
    Pick<IFallbackDeleteEventJobPayload, 'payload'>,
) => {
  const job =
    createMock<JobOf<typeof JobMessagingType.FALLBACK_DELETE_EVENT>>();
  job.id = 'job-1';
  job.data = {
    emitter: 'ms-event',
    emitterId: 'emitter-1',
    payload,
  } as typeof job.data;
  return job;
};
