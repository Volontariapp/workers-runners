import type { IFallbackCreateEventJobPayload } from '@volontariapp/messaging';
import { EventType } from '@volontariapp/contracts';
import { randomUUID } from 'crypto';

export const FallbackCreateEventFactory = {
  buildPayload(
    overrides?: Partial<IFallbackCreateEventJobPayload>,
  ): IFallbackCreateEventJobPayload {
    return {
      userId: randomUUID(),
      payload: {
        title: 'Test Factory Event',
        description: 'Description from factory',
        startAt: { seconds: Math.floor(Date.now() / 1000) + 86400, nanos: 0 },
        endAt: { seconds: Math.floor(Date.now() / 1000) + 172800, nanos: 0 },
        localisationName: 'Paris, France',
        type: EventType.EVENT_TYPE_SOCIAL,
        awardedImpactScore: 50,
        maxParticipants: 10,
        tagIds: [],
      },
      ...overrides,
    };
  },
};
