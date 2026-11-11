import { describe, it, expect } from '@jest/globals';
import { EventQueueModel, JobAuditModel } from '@volontariapp/database';
import { FileModel, ReleasedEntityModel } from '@volontariapp/domain-storage';
import { STORAGE_WORKER_ENTITIES } from '../../providers/storage-worker-entities.js';

describe('STORAGE_WORKER_ENTITIES (Unit)', () => {
  // PostgresFileRepository.completeScan and rejectScan write storage.file_scanned and
  // storage.file_rejected into event_queue, in the same transaction as the file update. A data
  // source without EventQueueModel throws EntityMetadataNotFoundError there: the transaction is
  // rolled back, the file stays SCANNING and the post waiting for the scan stays PENDING forever.
  it('registers the event_queue model that completeScan and rejectScan write', () => {
    expect(STORAGE_WORKER_ENTITIES).toContain(EventQueueModel);
  });

  it('keeps the models of the scan job: audit, files and released entities', () => {
    expect(STORAGE_WORKER_ENTITIES).toEqual(
      expect.arrayContaining([JobAuditModel, FileModel, ReleasedEntityModel]),
    );
  });
});
