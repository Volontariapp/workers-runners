import { Processor } from '@nestjs/bullmq';
import { BaseWorker } from '@volontariapp/workers';
import type { Job } from 'bullmq';
import type { ISendWelcomeEmailPayload, JobMessagingType } from '@volontariapp/messaging';
import { UserService } from './user.service';

const USER_SEND_WELCOME_EMAIL = 'user.send_welcome_email' as const;

@Processor('user-queue')
export class UserWorker extends BaseWorker<typeof USER_SEND_WELCOME_EMAIL & JobMessagingType> {
  constructor(private readonly userService: UserService) {
    super();
  }

  protected async processJob(job: Job<ISendWelcomeEmailPayload>): Promise<void> {
    const { userId, email, firstName } = job.data;

    this.logger.info('Processing send welcome email', {
      jobId: job.id,
      userId,
      email,
    });

    await this.userService.handleSendWelcomeEmail({
      userId,
      email,
      firstName,
    });
  }
}
