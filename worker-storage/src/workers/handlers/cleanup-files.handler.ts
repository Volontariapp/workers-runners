import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType, JobRegistry } from '@volontariapp/messaging';
import {
  MAX_PURGE_BATCH_SIZE,
  PostgresFileRepository,
} from '@volontariapp/domain-storage';
import { StoragePipelineService } from '@volontariapp/storage-pipeline';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from './interfaces/job-handler.interface.js';

export const MAX_PURGE_BATCHES_PER_JOB = 10;

@Injectable()
export class CleanupFilesHandler implements IJobHandler<
  typeof JobMessagingType.CLEANUP_FILES
> {
  private readonly logger = new Logger({
    context: CleanupFilesHandler.name,
  });

  readonly jobType = JobMessagingType.CLEANUP_FILES;

  constructor(
    @Inject(PostgresFileRepository)
    private readonly fileRepository: PostgresFileRepository,
    @Inject(StoragePipelineService)
    private readonly storagePipelineService: StoragePipelineService,
  ) {}

  async handle(job: JobOf<typeof JobMessagingType.CLEANUP_FILES>): Promise<{
    originalPayload: JobRegistry[typeof JobMessagingType.CLEANUP_FILES];
  }> {
    this.logger.info('Processing cleanup_files job');

    const s3Client = this.storagePipelineService.getS3Client();
    let totalDeleted = 0;
    let drained = false;

    for (let batch = 1; batch <= MAX_PURGE_BATCHES_PER_JOB; batch++) {
      const candidates =
        await this.fileRepository.listPurgeCandidates(MAX_PURGE_BATCH_SIZE);
      if (candidates.length === 0) {
        drained = true;
        break;
      }

      const quarantineIds = candidates.map((candidate) => candidate.id);
      const publicKeys = candidates.flatMap((candidate) =>
        candidate.publicKey === null ? [] : [candidate.publicKey],
      );

      try {
        await s3Client.deleteQuarantineObjects(quarantineIds);
        await s3Client.deletePublicObjects(publicKeys);
      } catch (error: unknown) {
        this.logger.error(
          `Failed to delete objects for purge batch ${String(batch)} (${String(candidates.length)} files), rows left ORPHANED: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }

      const deletedIds = await this.fileRepository.markDeleted(quarantineIds);
      totalDeleted += deletedIds.length;
      this.logger.info(
        `Purge batch ${String(batch)}: ${String(candidates.length)} candidates, ${String(deletedIds.length)} rows marked DELETED`,
      );
    }

    if (!drained) {
      this.logger.info(
        `Reached ${String(MAX_PURGE_BATCHES_PER_JOB)} batches, more files may remain for the next cleanup job`,
      );
    }
    this.logger.info(
      `cleanup_files job done: ${String(totalDeleted)} files purged`,
    );

    return { originalPayload: job.data.payload };
  }
}
