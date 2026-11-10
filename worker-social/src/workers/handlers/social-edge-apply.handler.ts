import { Inject, Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType, type JobRegistry } from '@volontariapp/messaging';
import {
  SocialEdgeApplyService,
  SocialEdgeNodeMissingError,
} from '@volontariapp/domain-social';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from '../job-handler.interface.js';

type SocialEdgeApplyJobType = typeof JobMessagingType.SOCIAL_EDGE_APPLY;

/**
 * Applique dans Neo4j l'etat voulu d'une relation sociale (table `social_edge`), puis ecrit
 * l'evenement metier dans `event_queue`. Toute erreur est relancee : BullMQ rejoue le job selon
 * `JOB_DELIVERY_OPTIONS` (12 tentatives, backoff exponentiel), puis le job reste en echec.
 */
@Injectable()
export class SocialEdgeApplyHandler implements IJobHandler<SocialEdgeApplyJobType> {
  private readonly logger = new Logger({
    context: SocialEdgeApplyHandler.name,
  });
  readonly jobType = JobMessagingType.SOCIAL_EDGE_APPLY;

  constructor(
    @Inject(SocialEdgeApplyService)
    private readonly applyService: SocialEdgeApplyService,
  ) {}

  async handle(
    job: JobOf<SocialEdgeApplyJobType>,
  ): Promise<{ originalPayload: JobRegistry[SocialEdgeApplyJobType] }> {
    const { payload, traceparent } = job.data;
    if (!job.id) {
      // L'id du job est l'id de la ligne jobs_outbox : sans lui, l'id d'evenement n'est pas deterministe.
      throw new Error('SOCIAL_EDGE_APPLY job has no id');
    }

    try {
      const result = await this.applyService.apply(payload, {
        jobId: job.id,
        traceparent,
      });
      this.logger.info('Social edge applied', {
        jobId: job.id,
        kind: payload.kind,
        action: payload.action,
        eventId: result.eventId,
      });
    } catch (error: unknown) {
      if (error instanceof SocialEdgeNodeMissingError) {
        this.logger.warn('Social edge node not in the graph yet, will retry', {
          jobId: job.id,
          kind: payload.kind,
          attempt: job.attemptsMade + 1,
        });
      } else {
        this.logger.error('Social edge apply failed', {
          jobId: job.id,
          kind: payload.kind,
          attempt: job.attemptsMade + 1,
          error,
        });
      }
      throw error;
    }

    return { originalPayload: payload };
  }
}
