import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType, JobRegistry } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';
import { TagService } from '@volontariapp/domain-event';

@Injectable()
export class FallbackCreateTagHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_CREATE_TAG
> {
  private readonly logger = new Logger({
    context: FallbackCreateTagHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_CREATE_TAG;

  constructor(
    @Inject(TagService)
    private readonly tagService: TagService,
  ) {}

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_CREATE_TAG>,
  ): Promise<{
    originalPayload: JobRegistry[typeof JobMessagingType.FALLBACK_CREATE_TAG];
  }> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );
    const command = job.data.payload.payload;
    const { name, slug, balise } = command;
    await this.tagService.create({ name, slug, balise });
    return { originalPayload: job.data.payload };
  }
}
