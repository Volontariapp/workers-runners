import { randomUUID } from 'crypto';
import type { IFallbackUpdateEventJobPayload } from '@volontariapp/messaging';
import { EventFactory } from './event.factory.js';

export class FallbackUpdateEventFactory {
  static buildPayload(
    eventId: string = randomUUID(),
  ): IFallbackUpdateEventJobPayload {
    const eventData = EventFactory.buildEventData();
    return {
      userId: randomUUID(),
      payload: {
        id: eventId,
        updateMask: ['title', 'description'],
        event: {
          id: eventId,
          title: eventData.name as string,
          description: eventData.description as string,
          localisationName: eventData.localisationName as string,
          location: {
            latitude: 0,
            longitude: 0,
          },
          state: 1,
          awardedImpactScore: 1,
          type: 0,
          maxParticipants: 50,
          startAt: { seconds: 1234567890, nanos: 0 },
          endAt: { seconds: 1234567890, nanos: 0 },
          tags: [],
          requirements: [],
          currentParticipants: 10,
        },
      },
    };
  }
}
