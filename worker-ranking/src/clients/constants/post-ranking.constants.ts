import { PostMediaStatus } from '@volontariapp/contracts-nest';

/** Plafond d'identifiants d'un appel ListPostsByIds (cote ms-post). */
export const POST_IDS_BATCH = 100;
/** Plafond global d'un appel ListRecentPostsByAuthors (cote ms-post). */
export const RECENT_POSTS_LIMIT = 300;
/** Posts par auteur : un auteur prolifique n'affame pas les autres. */
export const PER_AUTHOR_LIMIT = 5;
/** Plafond d'un appel ListCommentsByAuthor (cote ms-post). */
export const COMMENTS_LIMIT = 200;
/** Statuts de media affichables : sans media ou medias prets (PENDING et REJECTED exclus). */
export const VISIBLE_MEDIA: ReadonlySet<PostMediaStatus> = new Set([
  PostMediaStatus.POST_MEDIA_STATUS_NONE,
  PostMediaStatus.POST_MEDIA_STATUS_READY,
]);
