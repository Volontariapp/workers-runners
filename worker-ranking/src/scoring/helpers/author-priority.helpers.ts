import {
  authorSignalScore,
  type AuthorSignal,
} from '@volontariapp/domain-ranking';

/**
 * Ensemble d'auteurs candidats (docs/matching/11, section 4) : d'abord les auteurs avec des signaux,
 * par poids decroissant, puis les comptes suivis ; sans l'utilisateur ni les bloques, plafonne.
 */
export const authorPriority = (
  signalsByAuthor: ReadonlyMap<string, readonly AuthorSignal[]>,
  followedIds: readonly string[],
  excluded: ReadonlySet<string>,
  max: number,
): string[] => {
  const engaged = [...signalsByAuthor.entries()]
    .map(([authorId, signals]) => ({
      authorId,
      weight: authorSignalScore(signals),
    }))
    .sort(
      (left, right) =>
        right.weight - left.weight ||
        left.authorId.localeCompare(right.authorId),
    )
    .map(({ authorId }) => authorId);
  const ordered = [...new Set([...engaged, ...followedIds])].filter(
    (authorId) => !excluded.has(authorId),
  );
  return ordered.slice(0, max);
};
