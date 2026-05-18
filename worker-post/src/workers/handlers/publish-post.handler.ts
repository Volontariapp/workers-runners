import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  JobMessagingType,
  type IPublishPostPayload,
} from '@volontariapp/messaging';
import type { Job } from 'bullmq';
import type { IJobHandler } from '../job-handler.interface.js';

@Injectable()
export class PublishPostHandler implements IJobHandler<
  typeof JobMessagingType.PUBLISH_POST
> {
  private readonly logger = new Logger({
    context: PublishPostHandler.name,
  });
  readonly jobType = JobMessagingType.PUBLISH_POST;

  async handle(job: Job<IPublishPostPayload>): Promise<void> {
    const { postId, authorId } = job.data;
    this.logger.info('Publishing post', { postId, authorId });
    await Promise.resolve();
    this.logger.info('Post published', { postId });
  }
}
