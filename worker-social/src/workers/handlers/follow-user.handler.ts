import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType, type JobRegistry } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../job-handler.interface.js';

@Injectable()
export class FollowUserHandler implements IJobHandler<
  typeof JobMessagingType.FOLLOW_USER
> {
  private readonly logger = new Logger({
    context: FollowUserHandler.name,
  });
  readonly jobType = JobMessagingType.FOLLOW_USER;

  async handle(job: JobOf<typeof JobMessagingType.FOLLOW_USER>): Promise<{
    originalPayload: JobRegistry[typeof JobMessagingType.FOLLOW_USER];
  }> {
    const { followerId, followingId } = job.data.payload;
    this.logger.info('Following user', { followerId, followingId });
    await Promise.resolve();
    this.logger.info('User followed successfully', { followerId });
    return { originalPayload: job.data.payload };
  }
}
