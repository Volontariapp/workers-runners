import { Injectable, Inject } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { BaseWorker, JobAuditRepository } from '@volontariapp/workers';
import type { JobOf } from '@volontariapp/workers';
import { type JobMessagingType, UserQueue } from '@volontariapp/messaging';
import type { IJobHandler } from '../handlers/interfaces/job-handler.interface.js';

import { FallbackGetMyFollowsHandler } from '../handlers/fallback/fallback-get-my-follows.handler.js';
import { FallbackGetMyFollowersHandler } from '../handlers/fallback/fallback-get-my-followers.handler.js';
import { FallbackGetPostLikersHandler } from '../handlers/fallback/fallback-get-post-likers.handler.js';
import { FallbackGetEventParticipantsHandler } from '../handlers/fallback/fallback-get-event-participants.handler.js';
import { FallbackCreateBadgeHandler } from '../handlers/fallback/fallback-create-badge.handler.js';
import { FallbackUpdateBadgeHandler } from '../handlers/fallback/fallback-update-badge.handler.js';
import { FallbackDeleteBadgeHandler } from '../handlers/fallback/fallback-delete-badge.handler.js';
import { FallbackSignUpHandler } from '../handlers/fallback/fallback-sign-up.handler.js';
import { FallbackUpdateUserHandler } from '../handlers/fallback/fallback-update-user.handler.js';
import { FallbackDeleteUserHandler } from '../handlers/fallback/fallback-delete-user.handler.js';
import { FallbackAddBadgeToUserHandler } from '../handlers/fallback/fallback-add-badge-to-user.handler.js';
import { FallbackRemoveBadgeFromUserHandler } from '../handlers/fallback/fallback-remove-badge-from-user.handler.js';
import { FallbackIncrementImpactScoreHandler } from '../handlers/fallback/fallback-increment-impact-score.handler.js';

@Injectable()
@Processor(UserQueue.FALLBACK_USER)
export class FallbackUserWorker extends BaseWorker<JobMessagingType> {
  private readonly handlerMap: Map<JobMessagingType, IJobHandler>;

  constructor(
    @Inject(JobAuditRepository) auditRepo: JobAuditRepository,
    @Inject(FallbackGetMyFollowsHandler)
    fallbackGetMyFollowsHandler: FallbackGetMyFollowsHandler,
    @Inject(FallbackGetMyFollowersHandler)
    fallbackGetMyFollowersHandler: FallbackGetMyFollowersHandler,
    @Inject(FallbackGetPostLikersHandler)
    fallbackGetPostLikersHandler: FallbackGetPostLikersHandler,
    @Inject(FallbackGetEventParticipantsHandler)
    fallbackGetEventParticipantsHandler: FallbackGetEventParticipantsHandler,
    @Inject(FallbackCreateBadgeHandler)
    fallbackCreateBadgeHandler: FallbackCreateBadgeHandler,
    @Inject(FallbackUpdateBadgeHandler)
    fallbackUpdateBadgeHandler: FallbackUpdateBadgeHandler,
    @Inject(FallbackDeleteBadgeHandler)
    fallbackDeleteBadgeHandler: FallbackDeleteBadgeHandler,
    @Inject(FallbackSignUpHandler) fallbackSignUpHandler: FallbackSignUpHandler,
    @Inject(FallbackUpdateUserHandler)
    fallbackUpdateUserHandler: FallbackUpdateUserHandler,
    @Inject(FallbackDeleteUserHandler)
    fallbackDeleteUserHandler: FallbackDeleteUserHandler,
    @Inject(FallbackAddBadgeToUserHandler)
    fallbackAddBadgeToUserHandler: FallbackAddBadgeToUserHandler,
    @Inject(FallbackRemoveBadgeFromUserHandler)
    fallbackRemoveBadgeFromUserHandler: FallbackRemoveBadgeFromUserHandler,
    @Inject(FallbackIncrementImpactScoreHandler)
    fallbackIncrementImpactScoreHandler: FallbackIncrementImpactScoreHandler,
  ) {
    super(auditRepo);
    const handlers: IJobHandler[] = [
      fallbackGetMyFollowsHandler,
      fallbackGetMyFollowersHandler,
      fallbackGetPostLikersHandler,
      fallbackGetEventParticipantsHandler,
      fallbackCreateBadgeHandler,
      fallbackUpdateBadgeHandler,
      fallbackDeleteBadgeHandler,
      fallbackSignUpHandler,
      fallbackUpdateUserHandler,
      fallbackDeleteUserHandler,
      fallbackAddBadgeToUserHandler,
      fallbackRemoveBadgeFromUserHandler,
      fallbackIncrementImpactScoreHandler,
    ];
    this.handlerMap = new Map(handlers.map((h) => [h.jobType, h]));
  }

  protected async processJob(job: JobOf<JobMessagingType>): Promise<void> {
    const handler = this.handlerMap.get(job.name);
    if (!handler) {
      throw new Error(`Unhandled job type: ${job.name}`);
    }
    await handler.handle(job);
  }
}
