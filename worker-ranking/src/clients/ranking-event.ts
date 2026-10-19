import {
  EventType as GrpcEventType,
  GrpcDateMapper,
  type Event,
} from '@volontariapp/contracts-nest';
import type { EventType, GeoPoint } from '@volontariapp/domain-ranking';

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

const SUMMARY_LENGTH = 280;

const toDomainType = (type: GrpcEventType): EventType =>
  type === GrpcEventType.EVENT_TYPE_ECOLOGY ? 'ECOLOGY' : 'SOCIAL';

/** Les evenements sans date de debut ne sont pas classables : ils sont ecartes. */
export const toRankingEvent = (event: Event): RankingEvent | null => {
  const startAt = GrpcDateMapper.toDate(event.startAt);
  if (!startAt) {
    return null;
  }
  return {
    id: event.id,
    name: event.title,
    summary: event.description.slice(0, SUMMARY_LENGTH),
    type: toDomainType(event.type),
    tags: event.tags.map((tag) => tag.slug),
    startAt,
    location: event.location
      ? { lat: event.location.latitude, lng: event.location.longitude }
      : null,
    currentParticipants: event.currentParticipants,
    maxParticipants: event.maxParticipants,
  };
};
