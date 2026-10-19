import type { RankedPostItem } from '@volontariapp/domain-ranking';

export interface ScoredFeed {
  items: RankedPostItem[];
  /** COLD_START quand aucun post personnel n'existe, STRUCTURAL_ONLY sinon (Jev desactive pour le feed). */
  source: 'STRUCTURAL_ONLY' | 'COLD_START';
  candidateCount: number;
}
