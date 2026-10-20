import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType, JobRegistry } from '@volontariapp/messaging';
import {
  FileStatus,
  PostgresFileRepository,
  ScanStatus,
} from '@volontariapp/domain-storage';
import { StoragePipelineService } from '@volontariapp/storage-pipeline';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from './interfaces/job-handler.interface.js';

@Injectable()
export class ScanFileHandler implements IJobHandler<
  typeof JobMessagingType.SCAN_FILE
> {
  private readonly logger = new Logger({
    context: ScanFileHandler.name,
  });

  readonly jobType = JobMessagingType.SCAN_FILE;

  constructor(
    @Inject(PostgresFileRepository)
    private readonly fileRepository: PostgresFileRepository,
    @Inject(StoragePipelineService)
    private readonly storagePipelineService: StoragePipelineService,
  ) {}

  async handle(job: JobOf<typeof JobMessagingType.SCAN_FILE>): Promise<{
    originalPayload: JobRegistry[typeof JobMessagingType.SCAN_FILE];
  }> {
    const { fileId } = job.data.payload;
    this.logger.info(`Processing scan_file job for file ${fileId}`);

    const file = await this.fileRepository.findById(fileId);
    if (!file) {
      this.logger.warn(`File ${fileId} not found in database, skipping job`);
      return { originalPayload: job.data.payload };
    }

    if (file.scanStatus !== ScanStatus.SCANNING) {
      this.logger.info(
        `File ${fileId} is in scan_status ${file.scanStatus} (not SCANNING), skipping job`,
      );
      return { originalPayload: job.data.payload };
    }

    if (
      file.status === FileStatus.ORPHANED ||
      file.status === FileStatus.DELETED
    ) {
      this.logger.info(`File ${fileId} is ${file.status}, skipping job`);
      return { originalPayload: job.data.payload };
    }

    this.logger.info(
      `Executing storage pipeline for file ${fileId} (${file.entityType}, mime: ${file.declaredMimeType}, size: ${String(file.declaredSize)})`,
    );

    const pipelineResult = await this.storagePipelineService.processFile({
      fileId: file.id,
      entityType: file.entityType,
      declaredMimeType: file.declaredMimeType,
      declaredSize: file.declaredSize,
    });

    if (pipelineResult.status === 'REJECTED') {
      this.logger.warn(
        `Pipeline rejected file ${fileId}: reason ${pipelineResult.rejectionReason}`,
      );
      await this.fileRepository.rejectScan({
        fileId: file.id,
        reason: pipelineResult.rejectionReason,
      });
      return { originalPayload: job.data.payload };
    }

    // pipelineResult.status === 'CLEAN'
    this.logger.info(
      `Pipeline succeeded for file ${fileId}, completing scan with public key ${pipelineResult.publicKey}`,
    );

    const transition = await this.fileRepository.completeScan({
      fileId: file.id,
      publicKey: pipelineResult.publicKey,
    });

    if (!transition) {
      this.logger.warn(
        `File ${fileId} could not be completed (orphaned or deleted during scan), cleaning up public object ${pipelineResult.publicKey}`,
      );
      try {
        await this.storagePipelineService
          .getS3Client()
          .deletePublicObject(pipelineResult.publicKey);
      } catch (deleteError: unknown) {
        this.logger.warn(
          `Failed to delete public object ${pipelineResult.publicKey}: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`,
        );
      }
    } else {
      this.logger.info(`File ${fileId} scan completed successfully`);
    }

    return { originalPayload: job.data.payload };
  }
}
