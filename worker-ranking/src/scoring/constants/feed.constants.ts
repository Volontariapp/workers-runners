import type { EventTieState } from '@volontariapp/domain-ranking';

/** Date de repli d'un like decouvert seulement dans le graphe : maintenant moins 30 jours (docs/matching/11, section 2). */
export const LIKE_BACKFILL_AGE_DAYS = 30;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

/** Ordre des liens evenement : un post lie a plusieurs evenements garde le plus fort. */
export const EVENT_TIE_STRENGTH: Record<EventTieState, number> = {
  NONE: 0,
  PAST_JOINED: 1,
  FUTURE_WISHED: 2,
  FUTURE_JOINED: 3,
};
