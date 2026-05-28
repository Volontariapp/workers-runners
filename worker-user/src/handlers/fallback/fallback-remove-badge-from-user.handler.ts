import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';

@Injectable()
export class FallbackRemoveBadgeFromUserHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_REMOVE_BADGE_FROM_USER
> {
  private readonly logger = new Logger({
    context: FallbackRemoveBadgeFromUserHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_REMOVE_BADGE_FROM_USER;

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_REMOVE_BADGE_FROM_USER>,
  ): Promise<void> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );
    await Promise.resolve();
    // TODO: Implement compensation logic
  }
}
