import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  JobMessagingType,
  JobRegistry,
  IFallbackUpdateTagJobPayload,
} from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';
import { TagService } from '@volontariapp/domain-event';

@Injectable()
export class FallbackUpdateTagHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_UPDATE_TAG
> {
  private readonly logger = new Logger({
    context: FallbackUpdateTagHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_UPDATE_TAG;

  constructor(
    @Inject(TagService)
    private readonly tagService: TagService,
  ) {}

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_UPDATE_TAG>,
  ): Promise<{
    originalPayload: JobRegistry[typeof JobMessagingType.FALLBACK_UPDATE_TAG];
  }> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );
    const command: IFallbackUpdateTagJobPayload = job.data.payload;
    const { id, name, balise } = command.payload;

    await this.tagService.update(id, {
      name,
      balise,
    });
    return { originalPayload: job.data.payload };
  }
}
