/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  JobMessagingType,
  JobRegistry,
  IFallbackUpdateEventJobPayload,
} from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';
import {
  EventService,
  TagEntity,
  EventLocation,
} from '@volontariapp/domain-event';
import type { EventEntity } from '@volontariapp/domain-event';

@Injectable()
export class FallbackUpdateEventHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_UPDATE_EVENT
> {
  private readonly logger = new Logger({
    context: FallbackUpdateEventHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_UPDATE_EVENT;

  constructor(
    @Inject(EventService)
    private readonly eventService: EventService,
  ) {}

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_UPDATE_EVENT>,
  ): Promise<{
    originalPayload: JobRegistry[typeof JobMessagingType.FALLBACK_UPDATE_EVENT];
  }> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );

    const command: IFallbackUpdateEventJobPayload = job.data.payload;
    const { id, event, updateMask } = command.payload;

    const partialEntity: Partial<EventEntity> = {};

    if (event) {
      const shouldUpdate = (field: string) =>
        (updateMask || []).length !== 0 && (updateMask || []).includes(field);

      if (shouldUpdate('name') || shouldUpdate('title'))
        partialEntity.name = event.title;
      if (shouldUpdate('description'))
        partialEntity.description = event.description;
      if (shouldUpdate('type')) partialEntity.type = event.type;
      if (shouldUpdate('state')) partialEntity.state = event.state;
      if (shouldUpdate('awardedImpactScore'))
        partialEntity.awardedImpactScore = event.awardedImpactScore;
      if (shouldUpdate('maxParticipants'))
        partialEntity.maxParticipants = event.maxParticipants;
      if (shouldUpdate('organizerId'))
        partialEntity.organizerId = event.organizerId;
      if (shouldUpdate('localisationName'))
        partialEntity.localisationName = event.localisationName;

      if (shouldUpdate('startAt') && event.startAt !== undefined) {
        if (typeof event.startAt === 'object' && 'seconds' in event.startAt) {
          partialEntity.startAt = new Date(event.startAt.seconds * 1000);
        } else {
          partialEntity.startAt = new Date(event.startAt as string | number);
        }
      }

      if (shouldUpdate('endAt') && event.endAt !== undefined) {
        if (typeof event.endAt === 'object' && 'seconds' in event.endAt) {
          partialEntity.endAt = new Date(event.endAt.seconds * 1000);
        } else {
          partialEntity.endAt = new Date(event.endAt as string | number);
        }
      }

      if (shouldUpdate('location') && event.location !== undefined) {
        partialEntity.location = new EventLocation(
          event.location.latitude,
          event.location.longitude,
        );
      }

      if (shouldUpdate('tags')) {
        const tagsIds = (event.tags || []).map((t: TagEntity) => t.id);
        partialEntity.tags = tagsIds.map((tagId: string) => {
          const tag = new TagEntity();
          tag.id = tagId;
          return tag;
        });
      }
    }

    await this.eventService.update(id, partialEntity);
    return { originalPayload: job.data.payload };
  }
}
