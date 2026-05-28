import { Injectable } from '@nestjs/common';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import type { IJobHandler } from './interfaces/job-handler.interface.js';

@Injectable()
export class ResetPasswordHandler implements IJobHandler<
  typeof JobMessagingType.RESET_PASSWORD
> {
  private readonly logger = new Logger({ context: ResetPasswordHandler.name });
  readonly jobType = JobMessagingType.RESET_PASSWORD;

  async handle(
    job: JobOf<typeof JobMessagingType.RESET_PASSWORD>,
  ): Promise<void> {
    const { email, token } = job.data.payload;

    this.logger.info('Sending reset password email', { email });

    await Promise.resolve();

    void token;

    this.logger.info('Reset password email sent', { email });
  }
}
