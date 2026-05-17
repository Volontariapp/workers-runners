import { Inject } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { BaseWorker, JobAuditRepository } from '@volontariapp/workers';
import type { JobOf } from '@volontariapp/workers';
import type { JobMessagingType } from '@volontariapp/messaging';
import type { IJobHandler } from '../job-handler.interface.js';

export const USER_JOB_HANDLERS = Symbol('USER_JOB_HANDLERS');

@Processor('user-queue')
export class UserWorker extends BaseWorker<JobMessagingType> {
  private readonly handlerMap: Map<JobMessagingType, IJobHandler>;

  constructor(
    auditRepo: JobAuditRepository,
    @Inject(USER_JOB_HANDLERS) handlers: IJobHandler[],
  ) {
    super(auditRepo);
    this.handlerMap = new Map(handlers.map((h) => [h.jobType, h]));
  }

  protected async processJob(job: JobOf<JobMessagingType>): Promise<void> {
    const handler = this.handlerMap.get(job.name as JobMessagingType);
    if (!handler) throw new Error(`Unhandled job type: ${job.name}`);
    await handler.handle(job as never);
  }
}
