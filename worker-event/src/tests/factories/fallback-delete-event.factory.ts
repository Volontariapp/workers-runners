import { randomUUID } from 'crypto';
import type { IFallbackDeleteEventJobPayload } from '@volontariapp/messaging';

export class FallbackDeleteEventFactory {
  static buildPayload(): IFallbackDeleteEventJobPayload {
    return {
      userId: randomUUID(),
      payload: {
        id: randomUUID(),
      },
    };
  }
}
