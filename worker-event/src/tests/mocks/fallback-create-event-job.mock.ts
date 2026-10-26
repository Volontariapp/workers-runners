import { createMock } from '@volontariapp/testing';
import type {
  IFallbackCreateEventJobPayload,
  JobMessagingType,
} from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';

export const createFallbackCreateEventJobMock = (
  payload: IFallbackCreateEventJobPayload,
) => {
  const job =
    createMock<JobOf<typeof JobMessagingType.FALLBACK_CREATE_EVENT>>();
  job.id = 'job-1';
  job.data = {
    emitter: 'ms-event',
    emitterId: 'emitter-1',
    payload,
  } as typeof job.data;
  return job;
};
