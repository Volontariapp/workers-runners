import type { AuthorSignal } from '@volontariapp/domain-ranking';

export interface FeedSignals {
  /** Likes et commentaires de l'utilisateur, groupes par auteur du post (ses propres posts exclus). */
  signalsByAuthor: ReadonlyMap<string, readonly AuthorSignal[]>;
  /** Posts deja likes (like actif) ou commentes : retrogrades, pas exclus. */
  engagedPostIds: ReadonlySet<string>;
}
