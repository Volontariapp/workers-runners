import { GrpcDateMapper, type Post } from '@volontariapp/contracts-nest';
import { VISIBLE_MEDIA } from '../constants/post-ranking.constants.js';
import type { RankingPost } from '../interfaces/ranking-post.interface.js';

/** Les posts sans date de creation ne sont pas classables : ils sont ecartes. */
export const toRankingPost = (post: Post): RankingPost | null => {
  const createdAt = GrpcDateMapper.toDate(post.createdAt);
  if (!createdAt) {
    return null;
  }
  return {
    id: post.id,
    authorId: post.authorId,
    createdAt,
    mediaVisible: VISIBLE_MEDIA.has(post.mediaStatus),
  };
};
