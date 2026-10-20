import type { ScoredPost } from '../interfaces/scored-post.interface.js';

/** Score decroissant, identifiant en departage (ordre stable et reproductible). */
export const byScore = (left: ScoredPost, right: ScoredPost): number =>
  right.score - left.score || left.id.localeCompare(right.id);
