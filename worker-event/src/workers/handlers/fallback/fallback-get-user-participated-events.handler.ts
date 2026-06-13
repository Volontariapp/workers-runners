import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType, JobRegistry } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';

@Injectable()
export class FallbackGetUserParticipatedEventsHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_GET_USER_PARTICIPATED_EVENTS
> {
  private readonly logger = new Logger({
    context: FallbackGetUserParticipatedEventsHandler.name,
  });

  public readonly jobType =
    JobMessagingType.FALLBACK_GET_USER_PARTICIPATED_EVENTS;

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_GET_USER_PARTICIPATED_EVENTS>,
  ): Promise<{
    originalPayload: JobRegistry[typeof JobMessagingType.FALLBACK_GET_USER_PARTICIPATED_EVENTS];
  }> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );
    await Promise.resolve();
    // TODO: Implement compensation logic
    return { originalPayload: job.data.payload };
  }
}
