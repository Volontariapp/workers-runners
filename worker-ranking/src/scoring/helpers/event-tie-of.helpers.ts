import type { EventTieState } from '@volontariapp/domain-ranking';

/**
 * Lien d'un evenement avec l'utilisateur : futur et participe, futur et souhaite, passe et participe.
 * Un souhait passe ne compte pas (docs/matching/11, section 5).
 */
export const eventTieOf = (
  eventId: string,
  startAt: Date,
  now: Date,
  participated: ReadonlySet<string>,
  wished: ReadonlySet<string>,
): EventTieState => {
  const future = startAt.getTime() > now.getTime();
  if (participated.has(eventId)) {
    return future ? 'FUTURE_JOINED' : 'PAST_JOINED';
  }
  return future && wished.has(eventId) ? 'FUTURE_WISHED' : 'NONE';
};
