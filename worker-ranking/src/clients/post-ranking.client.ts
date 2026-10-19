import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  GrpcDateMapper,
  POST_SERVICE_NAME,
  type Post,
  type PostServiceClient,
} from '@volontariapp/contracts-nest';
import { POST_PACKAGE } from '../infrastructure/grpc/constants.js';
import { InternalMetadataProvider } from './internal-metadata.provider.js';
import {
  COMMENTS_LIMIT,
  PER_AUTHOR_LIMIT,
  POST_IDS_BATCH,
  POST_IDS_CONCURRENCY,
  RECENT_POSTS_LIMIT,
} from './constants/post-ranking.constants.js';
import { chunk } from './helpers/chunk.helpers.js';
import { toRankingPost } from './helpers/to-ranking-post.helpers.js';
import type { PostClientWithMetadata } from './interfaces/post-client-with-metadata.interface.js';
import type { RankingComment } from './interfaces/ranking-comment.interface.js';
import type { RankingPost } from './interfaces/ranking-post.interface.js';

/** Lectures de ms-post, source de verite des posts et des commentaires du feed. */
@Injectable()
export class PostRankingClient implements OnModuleInit {
  private posts!: PostClientWithMetadata;

  constructor(
    @Inject(POST_PACKAGE) private readonly client: ClientGrpc,
    private readonly internalMetadata: InternalMetadataProvider,
  ) {}

  onModuleInit(): void {
    this.posts = this.client.getService<PostServiceClient>(
      POST_SERVICE_NAME,
    ) as PostClientWithMetadata;
  }

  /** Posts recents des auteurs donnes, au plus 5 par auteur, du plus recent au plus ancien. */
  async recentByAuthors(
    authorIds: readonly string[],
    since: Date,
  ): Promise<RankingPost[]> {
    if (authorIds.length === 0) {
      return [];
    }
    return this.recent([...authorIds], false, since);
  }

  /** Posts recents de toute la plateforme (complement GLOBAL et demarrage a froid). */
  recentGlobal(since: Date): Promise<RankingPost[]> {
    return this.recent([], true, since);
  }

  /** Posts par identifiants, par lots de 100 ; les identifiants absents sont ignores. */
  async byIds(ids: readonly string[]): Promise<RankingPost[]> {
    const batches = chunk([...new Set(ids)], POST_IDS_BATCH);
    const posts: Post[] = [];
    for (const wave of chunk(batches, POST_IDS_CONCURRENCY)) {
      const pages = await Promise.all(
        wave.map(async (batch) =>
          firstValueFrom(
            this.posts.listPostsByIds(
              { ids: batch },
              await this.internalMetadata.get(),
            ),
          ),
        ),
      );
      posts.push(...pages.flatMap((page) => page.posts));
    }
    return this.toPosts(posts);
  }

  /** Commentaires de l'utilisateur depuis `since`, avec leur date (aucun registre local). */
  async commentsByAuthor(
    authorId: string,
    since: Date,
  ): Promise<RankingComment[]> {
    const response = await firstValueFrom(
      this.posts.listCommentsByAuthor(
        {
          authorId,
          since: GrpcDateMapper.toTimestamp(since),
          limit: COMMENTS_LIMIT,
        },
        await this.internalMetadata.get(),
      ),
    );
    return response.comments.flatMap((comment) => {
      const createdAt = GrpcDateMapper.toDate(comment.createdAt);
      return createdAt ? [{ postId: comment.postId, createdAt }] : [];
    });
  }

  private async recent(
    authorIds: string[],
    allAuthors: boolean,
    since: Date,
  ): Promise<RankingPost[]> {
    const response = await firstValueFrom(
      this.posts.listRecentPostsByAuthors(
        {
          authorIds,
          allAuthors,
          since: GrpcDateMapper.toTimestamp(since),
          perAuthorLimit: PER_AUTHOR_LIMIT,
          limit: RECENT_POSTS_LIMIT,
        },
        await this.internalMetadata.get(),
      ),
    );
    return this.toPosts(response.posts);
  }

  private toPosts(posts: readonly Post[]): RankingPost[] {
    return posts.flatMap((post) => {
      const mapped = toRankingPost(post);
      return mapped ? [mapped] : [];
    });
  }
}
