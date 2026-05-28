import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from './interfaces/job-handler.interface.js';

@Injectable()
export class PublishEventHandler implements IJobHandler<
  typeof JobMessagingType.PUBLISH_EVENT
> {
  private readonly logger = new Logger({
    context: PublishEventHandler.name,
  });
  readonly jobType = JobMessagingType.PUBLISH_EVENT;

  async handle(
    job: JobOf<typeof JobMessagingType.PUBLISH_EVENT>,
  ): Promise<void> {
    const { eventId, creatorId } = job.data.payload;
    this.logger.info('Publishing event', { eventId, creatorId });
    await Promise.resolve();
    this.logger.info('Event published', { eventId });
  }
}
