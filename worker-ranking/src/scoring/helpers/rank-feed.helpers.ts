import { diversifyByAuthor } from '@volontariapp/domain-ranking';
import type { ScoredPost } from '../interfaces/scored-post.interface.js';
import { byScore } from './by-score.helpers.js';

/**
 * Posts personnels tries, puis complement GLOBAL trie, puis un seul passage de diversite par auteur
 * sur la concatenation : la regle des 3 posts consecutifs vaut aussi a la jonction des deux blocs.
 */
export const rankFeed = (
  personal: readonly ScoredPost[],
  global: readonly ScoredPost[],
): ScoredPost[] =>
  diversifyByAuthor([
    ...[...personal].sort(byScore),
    ...[...global].sort(byScore),
  ]);
