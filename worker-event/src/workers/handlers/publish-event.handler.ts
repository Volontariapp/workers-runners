import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  JobMessagingType,
  type IPublishEventPayload,
} from '@volontariapp/messaging';
import type { Job } from 'bullmq';
import type { IJobHandler } from '../job-handler.interface.js';

@Injectable()
export class PublishEventHandler implements IJobHandler<
  typeof JobMessagingType.PUBLISH_EVENT
> {
  private readonly logger = new Logger({
    context: PublishEventHandler.name,
  });
  readonly jobType = JobMessagingType.PUBLISH_EVENT;

  async handle(job: Job<IPublishEventPayload>): Promise<void> {
    const { eventId, creatorId } = job.data;
    this.logger.info('Publishing event', { eventId, creatorId });
    await Promise.resolve();
    this.logger.info('Event published', { eventId });
  }
}
