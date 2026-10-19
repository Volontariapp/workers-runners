import { diversifyByAuthor } from '@volontariapp/domain-ranking';

/** Tri par score decroissant (identifiant en departage, stable) puis diversite par auteur. */
export const rankFeed = <
  T extends { id: string; authorId: string; score: number },
>(
  entries: readonly T[],
): T[] =>
  diversifyByAuthor(
    [...entries].sort(
      (left, right) =>
        right.score - left.score || left.id.localeCompare(right.id),
    ),
  );
