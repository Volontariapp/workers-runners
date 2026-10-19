export interface LikedPosts {
  ids: string[];
  /** Vrai si la lecture a atteint la fin du graphe (sans plafond) : seule une liste complete autorise les pierres tombales. */
  complete: boolean;
}
