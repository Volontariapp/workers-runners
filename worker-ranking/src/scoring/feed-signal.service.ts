import { Injectable } from '@nestjs/common';
import {
  LIKE_LOG_RETENTION_DAYS,
  RankingLikeLogService,
  type AuthorSignal,
} from '@volontariapp/domain-ranking';
import { Logger } from '@volontariapp/logger';
import { PostRankingClient } from '../clients/post-ranking.client.js';
import { SocialFeedClient } from '../clients/social-feed.client.js';
import { CustomConfig } from '../config/custom-config.js';
import { DAY_MS, LIKE_BACKFILL_AGE_DAYS } from './constants/feed.constants.js';
import type { FeedSignals } from './interfaces/feed-signals.interface.js';

/**
 * Signaux du feed (docs/matching/11, section 2) : journal de likes reconcilie avec le graphe (le
 * graphe dit si un like existe, le journal donne sa date), commentaires lus dans ms-post avec leur
 * date, puis auteur de chaque post resolu par ListPostsByIds.
 */
@Injectable()
export class FeedSignalService {
  private readonly logger = new Logger({ context: FeedSignalService.name });

  constructor(
    private readonly social: SocialFeedClient,
    private readonly posts: PostRankingClient,
    private readonly likeLogService: RankingLikeLogService,
    private readonly customConfig: CustomConfig,
  ) {}

  async collect(userId: string, now: Date): Promise<FeedSignals> {
    const { feedLikesLimit } = this.customConfig.ranking;

    const [graphLikes, comments] = await Promise.all([
      this.social.likedPostIds(userId, feedLikesLimit),
      this.posts.commentsByAuthor(
        userId,
        new Date(now.getTime() - LIKE_LOG_RETENTION_DAYS * DAY_MS),
      ),
    ]);
    const reconciled = await this.likeLogService.reconcileWithGraph({
      userId,
      graphPostIds: graphLikes.ids,
      graphIsComplete: graphLikes.complete,
      fallbackAt: new Date(now.getTime() - LIKE_BACKFILL_AGE_DAYS * DAY_MS),
    });
    const likes = await this.likeLogService.listActive(userId, feedLikesLimit);

    const engaged = [
      ...likes.map((like) => ({
        postId: like.postId,
        at: like.occurredAt,
        kind: 'LIKE' as const,
      })),
      ...comments.map((comment) => ({
        postId: comment.postId,
        at: comment.createdAt,
        kind: 'COMMENT' as const,
      })),
    ];
    const authorOf = new Map(
      (await this.posts.byIds(engaged.map(({ postId }) => postId))).map(
        (post) => [post.id, post.authorId],
      ),
    );

    const signalsByAuthor = new Map<string, AuthorSignal[]>();
    for (const { postId, at, kind } of engaged) {
      const authorId = authorOf.get(postId);
      if (!authorId || authorId === userId) {
        continue;
      }
      const signals = signalsByAuthor.get(authorId) ?? [];
      signals.push({ kind, ageDays: (now.getTime() - at.getTime()) / DAY_MS });
      signalsByAuthor.set(authorId, signals);
    }

    this.logger.info(
      `Signals of user ${userId}: ${String(likes.length)} like(s), ${String(comments.length)} comment(s), ${String(signalsByAuthor.size)} author(s), reconciliation tombstoned=${String(reconciled.tombstoned)} backfilled=${String(reconciled.backfilled)}`,
    );
    return {
      signalsByAuthor,
      engagedPostIds: new Set(engaged.map(({ postId }) => postId)),
    };
  }
}
