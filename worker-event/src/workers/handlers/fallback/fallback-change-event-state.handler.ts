import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  JobMessagingType,
  JobRegistry,
  IFallbackChangeEventStateJobPayload,
} from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';
import { EventService } from '@volontariapp/domain-event';

@Injectable()
export class FallbackChangeEventStateHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_CHANGE_EVENT_STATE
> {
  private readonly logger = new Logger({
    context: FallbackChangeEventStateHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_CHANGE_EVENT_STATE;

  constructor(
    @Inject(EventService)
    private readonly eventService: EventService,
  ) {}

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_CHANGE_EVENT_STATE>,
  ): Promise<{
    originalPayload: JobRegistry[typeof JobMessagingType.FALLBACK_CHANGE_EVENT_STATE];
  }> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );
    const command: IFallbackChangeEventStateJobPayload = job.data.payload;
    const { id, newState } = command.payload;
    await this.eventService.changeState(id, newState);
    return { originalPayload: job.data.payload };
  }
}
