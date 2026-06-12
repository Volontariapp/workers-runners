import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  JobMessagingType,
  IFallbackManageRequirementsJobPayload,
} from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';
import { EventService, RequirementService } from '@volontariapp/domain-event';

@Injectable()
export class FallbackManageRequirementsHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_MANAGE_REQUIREMENTS
> {
  private readonly logger = new Logger({
    context: FallbackManageRequirementsHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_MANAGE_REQUIREMENTS;

  constructor(
    private readonly eventService: EventService,
    private readonly requirementService: RequirementService,
  ) {}

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_MANAGE_REQUIREMENTS>,
  ): Promise<void> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );
    const command: IFallbackManageRequirementsJobPayload = job.data.payload;
    const data = command.payload;

    const event = await this.eventService.findById(data.eventId);

    if (data.add) {
      const newReq = await this.requirementService.create({
        name: data.add.name,
        quantity: data.add.neededQuantity,
        isSystem: false,
        createdBy: event.organizerId,
      });
      const requirements = [...(event.requirements ?? []), newReq];
      await this.eventService.update(data.eventId, { requirements });
    }

    if (data.remove) {
      const requirementId = data.remove.requirementId;
      const exists = (event.requirements ?? []).some(
        (r) => r.id === requirementId,
      );

      if (exists) {
        const requirements = (event.requirements ?? []).filter(
          (r) => r.id !== requirementId,
        );
        await this.eventService.update(data.eventId, { requirements });
      }
    }
  }
}
