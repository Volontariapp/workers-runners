import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';

@Injectable()
export class FallbackUpdateEventHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_UPDATE_EVENT
> {
  private readonly logger = new Logger({
    context: FallbackUpdateEventHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_UPDATE_EVENT;

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_UPDATE_EVENT>,
  ): Promise<void> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );
    // TODO: Implement compensation logic
    await Promise.resolve();
  }
}
