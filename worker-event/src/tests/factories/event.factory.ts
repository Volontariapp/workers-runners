import type { EventType, EventState } from '@volontariapp/contracts';
import type { EventEntity } from '@volontariapp/domain-event';

export class EventFactory {
  static buildEventData(
    overrides: Partial<EventEntity> = {},
  ): Partial<EventEntity> {
    return {
      name: 'Test Event',
      description: 'Test Event Description',
      localisationName: 'Test Location',
      startAt: new Date('2026-06-12T10:00:00Z'),
      endAt: new Date('2026-06-12T12:00:00Z'),
      organizerId: '00000000-0000-0000-0000-000000000000',
      awardedImpactScore: 10,
      maxParticipants: 50,
      type: 1 as EventType,
      state: 1 as EventState,
      ...overrides,
    };
  }
}
