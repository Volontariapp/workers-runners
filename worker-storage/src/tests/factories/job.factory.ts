import { createMock } from '@volontariapp/testing';
import type { JobOf } from '@volontariapp/workers';
import { JobMessagingType } from '@volontariapp/messaging';

export const buildScanFileJob = (
  fileId: string,
  id = 'job-123',
): JobOf<typeof JobMessagingType.SCAN_FILE> => {
  const job = createMock<JobOf<typeof JobMessagingType.SCAN_FILE>>();
  Object.defineProperty(job, 'id', { value: id, writable: true });
  Object.defineProperty(job, 'name', {
    value: JobMessagingType.SCAN_FILE,
    writable: true,
  });
  Object.defineProperty(job, 'data', {
    value: {
      id,
      type: JobMessagingType.SCAN_FILE,
      payload: { fileId },
    },
    writable: true,
  });
  Object.defineProperty(job, Symbol.iterator, { value: undefined });
  return job;
};
