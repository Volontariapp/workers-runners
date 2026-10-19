import type { RankedEventItem } from '@volontariapp/domain-ranking';

export interface ScoredList {
  items: RankedEventItem[];
  /** FULL quand le scoreur semantique a repondu, STRUCTURAL_ONLY sinon. */
  source: 'FULL' | 'STRUCTURAL_ONLY';
  candidateCount: number;
  semanticScoredCount: number;
}
