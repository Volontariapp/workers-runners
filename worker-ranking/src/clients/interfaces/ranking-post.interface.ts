/** Un post de ms-post, reduit a ce que le classement du feed utilise. */
export interface RankingPost {
  id: string;
  authorId: string;
  createdAt: Date;
  /** Vrai si le post n'a pas de media ou si ses medias sont prets (NONE ou READY). */
  mediaVisible: boolean;
}
