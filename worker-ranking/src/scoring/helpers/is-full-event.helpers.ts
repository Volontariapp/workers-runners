import type { RankingEvent } from '../../clients/interfaces/ranking-event.interface.js';

export const isFullEvent = (event: RankingEvent): boolean =>
  event.maxParticipants > 0 &&
  event.currentParticipants >= event.maxParticipants;
