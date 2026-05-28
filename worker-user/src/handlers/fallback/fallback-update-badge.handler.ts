import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';

@Injectable()
export class FallbackUpdateBadgeHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_UPDATE_BADGE
> {
  private readonly logger = new Logger({
    context: FallbackUpdateBadgeHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_UPDATE_BADGE;

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_UPDATE_BADGE>,
  ): Promise<void> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );
    const command = job.data.payload;
    this.logger.info(
      `Processing fallback job payload ${JSON.stringify(command)}`,
    );
    await Promise.resolve();
    // TODO: Implement compensation logic
  }
}
