import type { Job } from 'bullmq';
import type { JobMessagingType, JobRegistry } from '@volontariapp/messaging';

export interface IJobHandler<K extends JobMessagingType = JobMessagingType> {
  readonly jobType: K;
  handle(job: Job<JobRegistry[K]>): Promise<void>;
}
