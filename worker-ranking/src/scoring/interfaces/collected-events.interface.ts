import type { GeoPoint } from '@volontariapp/domain-ranking';
import type { RankingEvent } from '../../clients/interfaces/ranking-event.interface.js';

export interface CollectedEvents {
  candidates: RankingEvent[];
  /** Evenements participes ou souhaites, pour l'affinite de type et de tags. */
  history: RankingEvent[];
  /** Evenements touches par au moins un ami. */
  friendTouched: ReadonlySet<string>;
  /** Position de l'utilisateur, a defaut centre de son historique, a defaut inconnue. */
  origin: GeoPoint | null;
}
