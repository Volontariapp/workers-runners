import { randomUUID } from 'crypto';
import type { IFallbackManageRequirementsJobPayload } from '@volontariapp/messaging';

export class FallbackManageRequirementsFactory {
  static buildPayload(
    eventId: string = randomUUID(),
  ): IFallbackManageRequirementsJobPayload {
    return {
      userId: randomUUID(),
      payload: {
        eventId,
        add: {
          name: 'Water Bottles',
          description: 'Bottled water for participants',
          neededQuantity: 50,
        },
      },
    };
  }

  static buildPayloadRemove(
    eventId: string,
    requirementId: string,
  ): IFallbackManageRequirementsJobPayload {
    return {
      userId: randomUUID(),
      payload: {
        eventId,
        remove: {
          requirementId,
        },
      },
    };
  }
}
