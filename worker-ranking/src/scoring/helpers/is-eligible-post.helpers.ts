import type { RankingPost } from '../../clients/interfaces/ranking-post.interface.js';
import { DAY_MS } from '../constants/feed.constants.js';
import type { EligibilityRules } from '../interfaces/eligibility-rules.interface.js';

/**
 * Filtres du worker (docs/matching/11, section 4) : ni ses propres posts, ni ceux d'un bloque (dans
 * les deux sens), medias NONE ou READY seulement, age maximal plus long pour un post lie a un evenement.
 */
export const isEligiblePost = (
  post: RankingPost,
  linkedToEvent: boolean,
  rules: EligibilityRules,
): boolean => {
  if (post.authorId === rules.userId || rules.blockedIds.has(post.authorId)) {
    return false;
  }
  if (!post.mediaVisible) {
    return false;
  }
  const maxAgeDays = linkedToEvent
    ? rules.eventPostMaxAgeDays
    : rules.maxAgeDays;
  return rules.now.getTime() - post.createdAt.getTime() <= maxAgeDays * DAY_MS;
};
