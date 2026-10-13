import { Injectable, Inject } from '@nestjs/common';
import { UnrecoverableError } from 'bullmq';
import { Logger } from '@volontariapp/logger';
import {
  JobMessagingType,
  JobRegistry,
  IFallbackDeleteEventJobPayload,
} from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';
import { EventService } from '@volontariapp/domain-event';

type StoredFallbackDeletePayload = Pick<
  IFallbackDeleteEventJobPayload,
  'userId' | 'payload'
> &
  Partial<Pick<IFallbackDeleteEventJobPayload, 'userRole'>>;

@Injectable()
export class FallbackDeleteEventHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_DELETE_EVENT
> {
  private readonly logger = new Logger({
    context: FallbackDeleteEventHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_DELETE_EVENT;

  constructor(
    @Inject(EventService)
    private readonly eventService: EventService,
  ) {}

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_DELETE_EVENT>,
  ): Promise<{
    originalPayload: JobRegistry[typeof JobMessagingType.FALLBACK_DELETE_EVENT];
  }> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );
    // Jobs enqueued before userRole existed carry no role at runtime.
    const command: StoredFallbackDeletePayload = job.data.payload;
    const { id } = command.payload;
    if (!command.userRole) {
      this.logger.error(
        `Refusing fallback job ${String(job.id)}: missing userRole, ownership cannot be re-checked`,
      );
      throw new UnrecoverableError(
        `FALLBACK_DELETE_EVENT job ${String(job.id)} has no userRole`,
      );
    }
    await this.eventService.delete(id, command.userId, command.userRole);
    return { originalPayload: job.data.payload };
  }
}
