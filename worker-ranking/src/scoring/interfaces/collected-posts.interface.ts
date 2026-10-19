import type { FeedCandidate } from './feed-candidate.interface.js';

export interface CollectedPosts {
  /** Posts d'origine personnelle : suivis, engages, lies a un evenement de l'utilisateur. */
  personal: FeedCandidate[];
  /** Complement de la plateforme, place apres les posts personnels. */
  global: FeedCandidate[];
}
