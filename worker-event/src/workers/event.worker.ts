import { Injectable, Inject } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { BaseWorker, JobAuditRepository } from '@volontariapp/workers';
import type { JobOf } from '@volontariapp/workers';
import { type JobMessagingType, EventsQueue } from '@volontariapp/messaging';
import { PublishEventHandler } from './handlers/publish-event.handler.js';
import type { IJobHandler } from './handlers/interfaces/job-handler.interface.js';

@Injectable()
@Processor(EventsQueue.EVENTS)
export class EventWorker extends BaseWorker<JobMessagingType> {
  private readonly handlerMap: Map<JobMessagingType, IJobHandler>;

  constructor(
    @Inject(JobAuditRepository) auditRepo: JobAuditRepository,
    @Inject(PublishEventHandler) publishEventHandler: PublishEventHandler,
  ) {
    super(auditRepo);
    const handlers: IJobHandler[] = [publishEventHandler];
    this.handlerMap = new Map(handlers.map((h) => [h.jobType, h]));
  }

  protected async processJob(job: JobOf<JobMessagingType>): Promise<void> {
    const handler = this.handlerMap.get(job.name);
    if (!handler) {
      throw new Error(`Unhandled job type: ${job.name}`);
    }
    await handler.handle(job);
  }
}
