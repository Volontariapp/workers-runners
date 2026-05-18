import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType, type ISendWelcomeEmailPayload } from '@volontariapp/messaging';
import type { Job } from 'bullmq';
import type { IJobHandler } from '../../job-handler.interface.js';

@Injectable()
export class SendWelcomeEmailHandler
  implements IJobHandler<typeof JobMessagingType.SEND_WELCOME_EMAIL>
{
  private readonly logger = new Logger({ context: SendWelcomeEmailHandler.name });
  readonly jobType = JobMessagingType.SEND_WELCOME_EMAIL;

  async handle(job: Job<ISendWelcomeEmailPayload>): Promise<void> {
    const { userId, email, firstName } = job.data;

    this.logger.info('Sending welcome email', { userId, email });

    // TODO: call email service (SES, etc.)
    void firstName;

    this.logger.info('Welcome email sent', { userId });
  }
}
