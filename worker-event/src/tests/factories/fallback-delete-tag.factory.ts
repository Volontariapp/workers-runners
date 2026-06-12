import { randomUUID } from 'crypto';
import type { IFallbackDeleteTagJobPayload } from '@volontariapp/messaging';

export class FallbackDeleteTagFactory {
  static buildPayload(): IFallbackDeleteTagJobPayload {
    return {
      userId: randomUUID(),
      payload: {
        id: randomUUID(),
      },
    };
  }
}
