import {
  GrpcDateMapper,
  PostMediaStatus,
  type Comment,
  type Post,
} from '@volontariapp/contracts-nest';
import { AUTHOR_A } from './feed.factory.js';
import { NOW } from './ranking.factory.js';

/** Reponse paginee d'identifiants de ms-social. */
export const buildIdsResponse = (
  ids: string[],
  totalPages: number,
  page = 1,
) => ({
  ids,
  pagination: { total: ids.length, page, limit: 50, totalPages },
});

export const buildIds = (prefix: string, count: number): string[] =>
  Array.from({ length: count }, (_, index) => `${prefix}${String(index)}`);

export const buildGrpcPost = (
  id: string,
  overrides: Partial<Post> = {},
): Post => ({
  id,
  authorId: AUTHOR_A,
  title: `Post ${id}`,
  content: `Content of ${id}`,
  createdAt: GrpcDateMapper.toTimestamp(NOW),
  updatedAt: GrpcDateMapper.toTimestamp(NOW),
  eventId: undefined,
  media: [],
  mediaStatus: PostMediaStatus.POST_MEDIA_STATUS_NONE,
  ...overrides,
});

export const buildGrpcComment = (
  postId: string,
  overrides: Partial<Comment> = {},
): Comment => ({
  id: `comment-${postId}`,
  postId,
  authorId: AUTHOR_A,
  content: 'Nice',
  createdAt: GrpcDateMapper.toTimestamp(NOW),
  updatedAt: GrpcDateMapper.toTimestamp(NOW),
  ...overrides,
});
