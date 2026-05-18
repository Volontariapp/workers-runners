import { Injectable, Inject } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { BaseWorker, JobAuditRepository } from '@volontariapp/workers';
import type { JobOf } from '@volontariapp/workers';
import { type JobMessagingType, SocialQueue } from '@volontariapp/messaging';
import { FollowUserHandler } from './handlers/follow-user.handler.js';
import type { IJobHandler } from './job-handler.interface.js';

@Injectable()
@Processor(SocialQueue.SOCIAL)
export class SocialWorker extends BaseWorker<JobMessagingType> {
  private readonly handlerMap: Map<JobMessagingType, IJobHandler>;

  constructor(
    @Inject(JobAuditRepository) auditRepo: JobAuditRepository,
    @Inject(FollowUserHandler) handler: FollowUserHandler,
  ) {
    super(auditRepo);
    const handlers: IJobHandler[] = [handler];
    this.handlerMap = new Map(handlers.map((h) => [h.jobType, h]));
  }

  protected async processJob(job: JobOf<JobMessagingType>): Promise<void> {
    const handler = this.handlerMap.get(job.name);
    if (!handler) {
      throw new Error(`Unhandled job type: ${job.name}`);
    }
    await handler.handle(job as never);
  }
}
