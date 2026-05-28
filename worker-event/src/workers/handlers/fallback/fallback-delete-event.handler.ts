import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';

@Injectable()
export class FallbackDeleteEventHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_DELETE_EVENT
> {
  private readonly logger = new Logger({
    context: FallbackDeleteEventHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_DELETE_EVENT;

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_DELETE_EVENT>,
  ): Promise<void> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );
    await Promise.resolve();
    // TODO: Implement compensation logic
  }
}
