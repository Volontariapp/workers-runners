import { Injectable, Inject } from '@nestjs/common';
import { Processor } from '@nestjs/bullmq';
import { BaseWorker, JobAuditRepository } from '@volontariapp/workers';
import type { JobOf } from '@volontariapp/workers';
import { type JobMessagingType, UserQueue } from '@volontariapp/messaging';
import { SendWelcomeEmailHandler } from '../handlers/send-welcome-email.handler.js';
import { ResetPasswordHandler } from '../handlers/reset-password.handler.js';
import type { IJobHandler } from '../handlers/interfaces/job-handler.interface.js';

@Injectable()
@Processor(UserQueue.USER)
export class UserWorker extends BaseWorker<JobMessagingType> {
  private readonly handlerMap: Map<JobMessagingType, IJobHandler>;

  constructor(
    @Inject(JobAuditRepository) auditRepo: JobAuditRepository,
    @Inject(SendWelcomeEmailHandler)
    sendWelcomeEmailHandler: SendWelcomeEmailHandler,
    @Inject(ResetPasswordHandler) resetPasswordHandler: ResetPasswordHandler,
  ) {
    super(auditRepo);
    const handlers: IJobHandler[] = [
      sendWelcomeEmailHandler,
      resetPasswordHandler,
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
