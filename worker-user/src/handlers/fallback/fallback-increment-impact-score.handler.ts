import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';

@Injectable()
export class FallbackIncrementImpactScoreHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_INCREMENT_IMPACT_SCORE
> {
  private readonly logger = new Logger({
    context: FallbackIncrementImpactScoreHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_INCREMENT_IMPACT_SCORE;

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_INCREMENT_IMPACT_SCORE>,
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
