import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  JobMessagingType,
  type IFollowUserPayload,
} from '@volontariapp/messaging';
import type { Job } from 'bullmq';
import type { IJobHandler } from '../job-handler.interface.js';

@Injectable()
export class FollowUserHandler implements IJobHandler<
  typeof JobMessagingType.FOLLOW_USER
> {
  private readonly logger = new Logger({
    context: FollowUserHandler.name,
  });
  readonly jobType = JobMessagingType.FOLLOW_USER;

  async handle(job: Job<IFollowUserPayload>): Promise<void> {
    const { followerId, followingId } = job.data;
    this.logger.info('Following user', { followerId, followingId });
    await Promise.resolve();
    this.logger.info('User followed successfully', { followerId });
  }
}
