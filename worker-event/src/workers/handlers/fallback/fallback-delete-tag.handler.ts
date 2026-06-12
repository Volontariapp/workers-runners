import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  JobMessagingType,
  IFallbackDeleteTagJobPayload,
} from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';
import { TagService } from '@volontariapp/domain-event';

@Injectable()
export class FallbackDeleteTagHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_DELETE_TAG
> {
  private readonly logger = new Logger({
    context: FallbackDeleteTagHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_DELETE_TAG;

  constructor(private readonly tagService: TagService) {}

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_DELETE_TAG>,
  ): Promise<void> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );
    const command: IFallbackDeleteTagJobPayload = job.data.payload;
    const { id } = command.payload;
    await this.tagService.delete(id);
  }
}
