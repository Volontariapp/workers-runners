import { Injectable, Inject } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { BaseWorker, JobAuditRepository } from '@volontariapp/workers';
import type { JobOf } from '@volontariapp/workers';
import { type JobMessagingType, EventsQueue } from '@volontariapp/messaging';
import type { IJobHandler } from './handlers/interfaces/job-handler.interface.js';

import { FallbackGetUserCreatedEventsHandler } from './handlers/fallback/fallback-get-user-created-events.handler.js';
import { FallbackGetUserParticipatedEventsHandler } from './handlers/fallback/fallback-get-user-participated-events.handler.js';
import { FallbackGetUserWishedEventsHandler } from './handlers/fallback/fallback-get-user-wished-events.handler.js';
import { FallbackCreateEventHandler } from './handlers/fallback/fallback-create-event.handler.js';
import { FallbackUpdateEventHandler } from './handlers/fallback/fallback-update-event.handler.js';
import { FallbackChangeEventStateHandler } from './handlers/fallback/fallback-change-event-state.handler.js';
import { FallbackManageRequirementsHandler } from './handlers/fallback/fallback-manage-requirements.handler.js';
import { FallbackDeleteEventHandler } from './handlers/fallback/fallback-delete-event.handler.js';
import { FallbackCreateTagHandler } from './handlers/fallback/fallback-create-tag.handler.js';
import { FallbackUpdateTagHandler } from './handlers/fallback/fallback-update-tag.handler.js';
import { FallbackDeleteTagHandler } from './handlers/fallback/fallback-delete-tag.handler.js';

@Injectable()
@Processor(EventsQueue.FALLBACK_EVENTS)
export class FallbackEventWorker extends BaseWorker<JobMessagingType> {
  private readonly handlerMap: Map<JobMessagingType, IJobHandler>;

  constructor(
    @Inject(JobAuditRepository) auditRepo: JobAuditRepository,
    @Inject(FallbackGetUserCreatedEventsHandler)
    fallbackGetUserCreatedEventsHandler: FallbackGetUserCreatedEventsHandler,
    @Inject(FallbackGetUserParticipatedEventsHandler)
    fallbackGetUserParticipatedEventsHandler: FallbackGetUserParticipatedEventsHandler,
    @Inject(FallbackGetUserWishedEventsHandler)
    fallbackGetUserWishedEventsHandler: FallbackGetUserWishedEventsHandler,
    @Inject(FallbackCreateEventHandler)
    fallbackCreateEventHandler: FallbackCreateEventHandler,
    @Inject(FallbackUpdateEventHandler)
    fallbackUpdateEventHandler: FallbackUpdateEventHandler,
    @Inject(FallbackChangeEventStateHandler)
    fallbackChangeEventStateHandler: FallbackChangeEventStateHandler,
    @Inject(FallbackManageRequirementsHandler)
    fallbackManageRequirementsHandler: FallbackManageRequirementsHandler,
    @Inject(FallbackDeleteEventHandler)
    fallbackDeleteEventHandler: FallbackDeleteEventHandler,
    @Inject(FallbackCreateTagHandler)
    fallbackCreateTagHandler: FallbackCreateTagHandler,
    @Inject(FallbackUpdateTagHandler)
    fallbackUpdateTagHandler: FallbackUpdateTagHandler,
    @Inject(FallbackDeleteTagHandler)
    fallbackDeleteTagHandler: FallbackDeleteTagHandler,
  ) {
    super(auditRepo);
    const handlers: IJobHandler[] = [
      fallbackGetUserCreatedEventsHandler,
      fallbackGetUserParticipatedEventsHandler,
      fallbackGetUserWishedEventsHandler,
      fallbackCreateEventHandler,
      fallbackUpdateEventHandler,
      fallbackChangeEventStateHandler,
      fallbackManageRequirementsHandler,
      fallbackDeleteEventHandler,
      fallbackCreateTagHandler,
      fallbackUpdateTagHandler,
      fallbackDeleteTagHandler,
    ];
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
