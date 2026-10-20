import type { EventTieState } from '@volontariapp/domain-ranking';
import { EVENT_TIE_STRENGTH } from '../constants/feed.constants.js';

/** Un post lie a plusieurs evenements garde le lien le plus fort. */
export const strongerTie = (
  left: EventTieState,
  right: EventTieState,
): EventTieState =>
  EVENT_TIE_STRENGTH[right] > EVENT_TIE_STRENGTH[left] ? right : left;
