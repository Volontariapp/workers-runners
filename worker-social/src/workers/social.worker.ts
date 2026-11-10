import { Injectable, Inject } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { BaseWorker, JobAuditRepository } from '@volontariapp/workers';
import type { JobOf } from '@volontariapp/workers';
import {
  type JobMessagingType,
  type JobRegistry,
  SocialQueue,
} from '@volontariapp/messaging';
import { config } from '../config/runtime-config.js';
import { FollowUserHandler } from './handlers/follow-user.handler.js';
import { SocialEdgeApplyHandler } from './handlers/social-edge-apply.handler.js';
import type { IJobHandler } from './job-handler.interface.js';

/**
 * Concurrence et limiteur plafonnent le debit d'ecriture vers Neo4j, quelle que soit la rafale
 * (file pleine apres une panne). Reglables par variables d'environnement.
 */
@Injectable()
@Processor(SocialQueue.SOCIAL, {
  concurrency: config.social.workerConcurrency,
  limiter: {
    max: config.social.limiterMax,
    duration: config.social.limiterDurationMs,
  },
})
export class SocialWorker extends BaseWorker<JobMessagingType> {
  private readonly handlerMap: Map<JobMessagingType, IJobHandler>;

  constructor(
    @Inject(JobAuditRepository) auditRepo: JobAuditRepository,
    @Inject(FollowUserHandler) followHandler: FollowUserHandler,
    @Inject(SocialEdgeApplyHandler) edgeApplyHandler: SocialEdgeApplyHandler,
  ) {
    super(auditRepo);
    const handlers: IJobHandler[] = [followHandler, edgeApplyHandler];
    this.handlerMap = new Map(handlers.map((h) => [h.jobType, h]));
  }

  protected async processJob(
    job: JobOf<JobMessagingType>,
  ): Promise<{ originalPayload: JobRegistry[JobMessagingType] }> {
    const handler = this.handlerMap.get(job.name);
    if (!handler) {
      throw new Error(`Unhandled job type: ${job.name}`);
    }
    return handler.handle(job);
  }
}
