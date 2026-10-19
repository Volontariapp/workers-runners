import type { TasteSummary } from '@volontariapp/domain-ranking';
import type { RankingEvent } from '../../clients/interfaces/ranking-event.interface.js';
import { toScorerCandidate } from './to-scorer-candidate.helpers.js';

export const tasteOf = (history: readonly RankingEvent[]): TasteSummary => {
  const ecology = history.filter((event) => event.type === 'ECOLOGY').length;
  const total = history.length;
  return {
    ecologyShare: total === 0 ? 0 : ecology / total,
    socialShare: total === 0 ? 0 : (total - ecology) / total,
    history: history.map(toScorerCandidate),
  };
};
