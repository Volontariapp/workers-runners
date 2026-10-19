import { GrpcDateMapper, type Event } from '@volontariapp/contracts-nest';
import { SUMMARY_LENGTH } from '../constants/event-ranking.constants.js';
import type { RankingEvent } from '../interfaces/ranking-event.interface.js';
import { toDomainEventType } from './to-domain-event-type.helpers.js';

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
    type: toDomainEventType(event.type),
    tags: event.tags.map((tag) => tag.slug),
    startAt,
    location: event.location
      ? { lat: event.location.latitude, lng: event.location.longitude }
      : null,
    currentParticipants: event.currentParticipants,
    maxParticipants: event.maxParticipants,
  };
};
