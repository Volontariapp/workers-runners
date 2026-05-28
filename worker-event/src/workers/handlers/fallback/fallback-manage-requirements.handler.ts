import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';

@Injectable()
export class FallbackManageRequirementsHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_MANAGE_REQUIREMENTS
> {
  private readonly logger = new Logger({
    context: FallbackManageRequirementsHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_MANAGE_REQUIREMENTS;

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_MANAGE_REQUIREMENTS>,
  ): Promise<void> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );
    await Promise.resolve();
    // TODO: Implement compensation logic
  }
}
