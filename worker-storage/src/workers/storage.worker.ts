import { Injectable, Inject } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { BaseWorker, JobAuditRepository } from '@volontariapp/workers';
import type { JobOf } from '@volontariapp/workers';
import {
  type JobMessagingType,
  JobRegistry,
  StorageQueue,
} from '@volontariapp/messaging';
import { ScanFileHandler } from './handlers/scan-file.handler.js';
import type { IJobHandler } from './handlers/interfaces/job-handler.interface.js';

@Injectable()
@Processor(StorageQueue.STORAGE)
export class StorageWorker extends BaseWorker<JobMessagingType> {
  private readonly handlerMap: Map<JobMessagingType, IJobHandler>;

  constructor(
    @Inject(JobAuditRepository) auditRepo: JobAuditRepository,
    @Inject(ScanFileHandler) scanFileHandler: ScanFileHandler,
  ) {
    super(auditRepo);
    const handlers: IJobHandler[] = [scanFileHandler];
    this.handlerMap = new Map(handlers.map((h) => [h.jobType, h]));
  }

  protected async processJob(
    job: JobOf<JobMessagingType>,
  ): Promise<{ originalPayload: JobRegistry[JobMessagingType] }> {
    const handler = this.handlerMap.get(job.name);
    if (!handler) {
      throw new Error(`Unhandled job type: ${job.name}`);
    }
    return handler.handle(job) as Promise<{
      originalPayload: JobRegistry[JobMessagingType];
    }>;
  }
}
