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
  ComputeUserFeedHandler,
  FanoutRankingHandler,
  type IJobHandler,
} from './handlers/index.js';

/** File de fond des posts : calculs differes du feed et fan-out de POST_CREATED. */
@Injectable()
@Processor(RankingQueue.FEED, {
  concurrency: config.ranking.workerConcurrency,
})
export class RankingFeedWorker extends BaseWorker<JobMessagingType> {
  private readonly handlerMap: Map<JobMessagingType, IJobHandler>;

  constructor(
    @Inject(JobAuditRepository) auditRepo: JobAuditRepository,
    @Inject(ComputeUserFeedHandler) computeHandler: ComputeUserFeedHandler,
    @Inject(FanoutRankingHandler) fanoutHandler: FanoutRankingHandler,
  ) {
    super(auditRepo);
    const handlers: IJobHandler[] = [computeHandler, fanoutHandler];
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
