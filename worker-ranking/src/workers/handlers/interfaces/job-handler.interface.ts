import type { JobOf } from '@volontariapp/workers';
import type { JobMessagingType, JobRegistry } from '@volontariapp/messaging';

export interface IJobHandler<K extends JobMessagingType = JobMessagingType> {
  readonly jobType: K;
  /** Retourne le payload d'origine : la boucle d'audit en a besoin. */
  handle(job: JobOf<K>): Promise<{ originalPayload: JobRegistry[K] }>;
}
