import { randomUUID } from 'crypto';
import { EventState } from '@volontariapp/contracts';
import type { IFallbackChangeEventStateJobPayload } from '@volontariapp/messaging';

export class FallbackChangeEventStateFactory {
  static buildPayload(): IFallbackChangeEventStateJobPayload {
    return {
      userId: randomUUID(),
      payload: {
        id: randomUUID(),
        newState: EventState.EVENT_STATE_PUBLISHED,
      },
    };
  }
}
