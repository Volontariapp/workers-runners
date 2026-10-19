import type { GeoPoint } from '@volontariapp/domain-ranking';
import type { EventType } from '@volontariapp/domain-ranking';

/** Un evenement de ms-event, reduit a ce que le classement utilise. */
export interface RankingEvent {
  id: string;
  name: string;
  summary: string;
  type: EventType;
  tags: readonly string[];
  startAt: Date;
  location: GeoPoint | null;
  currentParticipants: number;
  maxParticipants: number;
}
