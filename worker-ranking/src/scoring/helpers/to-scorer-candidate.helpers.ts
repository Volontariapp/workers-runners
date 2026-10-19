import type { RankingCandidate } from '@volontariapp/domain-ranking';
import type { RankingEvent } from '../../clients/interfaces/ranking-event.interface.js';

export const toScorerCandidate = (event: RankingEvent): RankingCandidate => ({
  eventId: event.id,
  name: event.name,
  type: event.type,
  tags: event.tags,
  summary: event.summary,
});
