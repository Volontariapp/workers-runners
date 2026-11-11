import { EventQueueModel, JobAuditModel } from '@volontariapp/database';
import { FileModel, ReleasedEntityModel } from '@volontariapp/domain-storage';

/**
 * TypeORM models the worker-storage data source knows. `EventQueueModel` is needed by
 * `completeScan` and `rejectScan` (domain-storage), which write the scan result event in the same
 * transaction as the file update.
 */
export const STORAGE_WORKER_ENTITIES = [
  JobAuditModel,
  FileModel,
  ReleasedEntityModel,
  EventQueueModel,
];
