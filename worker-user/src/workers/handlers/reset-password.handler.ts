import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import {
  JobMessagingType,
  type IResetPasswordPayload,
} from '@volontariapp/messaging';
import type { Job } from 'bullmq';
import type { IJobHandler } from '../job-handler.interface.js';

@Injectable()
export class ResetPasswordHandler implements IJobHandler<
  typeof JobMessagingType.RESET_PASSWORD
> {
  private readonly logger = new Logger({ context: ResetPasswordHandler.name });
  readonly jobType = JobMessagingType.RESET_PASSWORD;

  async handle(job: Job<IResetPasswordPayload>): Promise<void> {
    const { email, token } = job.data;

    this.logger.info('Sending reset password email', { email });

    await Promise.resolve();

    void token;

    this.logger.info('Reset password email sent', { email });
  }
}
