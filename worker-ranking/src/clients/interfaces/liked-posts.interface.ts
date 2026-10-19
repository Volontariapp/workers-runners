export interface LikedPosts {
  ids: string[];
  /** Vrai seulement si la lecture tient sur une seule page, sans plafond : seule une liste complete autorise les pierres tombales. */
  complete: boolean;
}
