import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  IFallbackCreateEventJobPayload,
  JobMessagingType,
} from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../interfaces/job-handler.interface.js';
import { EventService, TagEntity } from '@volontariapp/domain-event';

@Injectable()
export class FallbackCreateEventHandler implements IJobHandler<
  typeof JobMessagingType.FALLBACK_CREATE_EVENT
> {
  private readonly logger = new Logger({
    context: FallbackCreateEventHandler.name,
  });

  public readonly jobType = JobMessagingType.FALLBACK_CREATE_EVENT;

  constructor(private readonly eventService: EventService) {}

  async handle(
    job: JobOf<typeof JobMessagingType.FALLBACK_CREATE_EVENT>,
  ): Promise<void> {
    this.logger.info(
      `Processing fallback job ${String(job.id)} of type ${job.name}`,
    );
    const command: IFallbackCreateEventJobPayload = job.data.payload;

    let startAt: Date | undefined;
    if (command.payload.startAt) {
      if (
        typeof command.payload.startAt === 'object' &&
        'seconds' in command.payload.startAt
      ) {
        startAt = new Date(command.payload.startAt.seconds * 1000);
      } else {
        startAt = new Date(command.payload.startAt);
      }
    }

    let endAt: Date | undefined;
    if (command.payload.endAt) {
      if (
        typeof command.payload.endAt === 'object' &&
        'seconds' in command.payload.endAt
      ) {
        endAt = new Date(command.payload.endAt.seconds * 1000);
      } else {
        endAt = new Date(command.payload.endAt);
      }
    }

    const tags = command.payload.tagIds.map((id: string) => {
      const tag = new TagEntity();
      tag.id = id;
      return tag;
    });

    await this.eventService.create({
      name: command.payload.title,
      description: command.payload.description,
      startAt,
      endAt,
      localisationName: command.payload.localisationName,
      type: command.payload.type,
      awardedImpactScore: command.payload.awardedImpactScore,
      maxParticipants: command.payload.maxParticipants,
      tags,
    });
  }
}
