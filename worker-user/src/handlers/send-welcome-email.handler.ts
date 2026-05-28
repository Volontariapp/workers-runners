import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from './interfaces/job-handler.interface.js';

@Injectable()
export class SendWelcomeEmailHandler implements IJobHandler<
  typeof JobMessagingType.SEND_WELCOME_EMAIL
> {
  private readonly logger = new Logger({
    context: SendWelcomeEmailHandler.name,
  });
  readonly jobType = JobMessagingType.SEND_WELCOME_EMAIL;

  async handle(
    job: JobOf<typeof JobMessagingType.SEND_WELCOME_EMAIL>,
  ): Promise<void> {
    const { userId, email } = job.data.payload;

    this.logger.info('Sending welcome email', { userId, email });

    await Promise.resolve();

    this.logger.info('Welcome email sent', { userId });
  }
}
