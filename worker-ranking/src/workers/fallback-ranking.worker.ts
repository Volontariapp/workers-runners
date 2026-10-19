import { Inject, Injectable } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { BaseWorker, JobAuditRepository } from '@volontariapp/workers';
import type { JobOf } from '@volontariapp/workers';
import {
  RankingQueue,
  type JobMessagingType,
  type JobRegistry,
} from '@volontariapp/messaging';
import { config } from '../config/runtime-config.js';
import {
  ComputeUserRankingHandler,
  type IJobHandler,
} from './handlers/index.js';

/** File de repli : un utilisateur attend un ecran (ON_DEMAND, MANUAL), il ne passe pas derriere un fan-out. */
@Injectable()
@Processor(RankingQueue.FALLBACK_RANKING, {
  concurrency: config.ranking.workerConcurrency,
})
export class FallbackRankingWorker extends BaseWorker<JobMessagingType> {
  private readonly handlerMap: Map<JobMessagingType, IJobHandler>;

  constructor(
    @Inject(JobAuditRepository) auditRepo: JobAuditRepository,
    @Inject(ComputeUserRankingHandler)
    computeHandler: ComputeUserRankingHandler,
  ) {
    super(auditRepo);
    const handlers: IJobHandler[] = [computeHandler];
    this.handlerMap = new Map(
      handlers.map((handler) => [handler.jobType, handler]),
    );
  }

  protected async processJob(
    job: JobOf<JobMessagingType>,
  ): Promise<{ originalPayload: JobRegistry[JobMessagingType] }> {
    const handler = this.handlerMap.get(job.name);
    if (!handler) {
      throw new Error(`Unhandled job type: ${job.name}`);
    }
    return handler.handle(job) as Promise<{
      originalPayload: JobRegistry[JobMessagingType];
    }>;
  }
}
