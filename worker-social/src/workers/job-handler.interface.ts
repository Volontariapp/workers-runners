import type { JobOf } from '@volontariapp/workers';
import type { JobMessagingType, JobRegistry } from '@volontariapp/messaging';

export interface IJobHandler<K extends JobMessagingType = JobMessagingType> {
  readonly jobType: K;
  handle(job: JobOf<K>): Promise<{ originalPayload: JobRegistry[K] }>;
}
