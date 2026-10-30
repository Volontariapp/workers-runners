import { Injectable } from '@nestjs/common';
import { PostOrigin, type EventTieState } from '@volontariapp/domain-ranking';
import { Logger } from '@volontariapp/logger';
import { EventRankingClient } from '../clients/event-ranking.client.js';
import type { RankingPost } from '../clients/interfaces/ranking-post.interface.js';
import { PostRankingClient } from '../clients/post-ranking.client.js';
import { SocialFeedClient } from '../clients/social-feed.client.js';
import { SocialRankingClient } from '../clients/social-ranking.client.js';
import { CustomConfig } from '../config/custom-config.js';
import { chunk } from '../clients/helpers/chunk.helpers.js';
import { DAY_MS, EVENT_POSTS_CONCURRENCY } from './constants/feed.constants.js';
import { FeedSignalService } from './feed-signal.service.js';
import { authorPriority } from './helpers/author-priority.helpers.js';
import { eventTieOf } from './helpers/event-tie-of.helpers.js';
import { isEligiblePost } from './helpers/is-eligible-post.helpers.js';
import { strongerTie } from './helpers/stronger-tie.helpers.js';
import type { CollectedPosts } from './interfaces/collected-posts.interface.js';
import type { EligibilityRules } from './interfaces/eligibility-rules.interface.js';
import type { FeedCandidate } from './interfaces/feed-candidate.interface.js';
import type { FeedSignals } from './interfaces/feed-signals.interface.js';

/**
 * Candidats du feed (docs/matching/11, section 4) : posts recents des auteurs (signaux puis
 * abonnements), posts lies aux evenements de l'utilisateur, filtres, puis complement GLOBAL si la
 * liste personnelle est trop courte.
 */
@Injectable()
export class FeedCandidateService {
  private readonly logger = new Logger({ context: FeedCandidateService.name });

  constructor(
    private readonly signals: FeedSignalService,
    private readonly socialFeed: SocialFeedClient,
    private readonly socialRanking: SocialRankingClient,
    private readonly events: EventRankingClient,
    private readonly posts: PostRankingClient,
    private readonly customConfig: CustomConfig,
  ) {}

  async collect(userId: string, now: Date): Promise<CollectedPosts> {
    const {
      feedAuthors,
      feedMaxAgeDays,
      feedEventPostMaxAgeDays,
      feedMinItems,
      feedGlobalEnabled,
      historySize,
      excludeLimit,
    } = this.customConfig.ranking;

    const [signals, followedIds, blockedIds, participatedIds, wishedIds] =
      await Promise.all([
        this.signals.collect(userId, now),
        this.socialFeed.followedIds(userId, feedAuthors),
        this.socialFeed.blockedIds(userId, excludeLimit),
        this.socialRanking.participatedEventIds(userId, historySize),
        this.socialRanking.wishedEventIds(userId, historySize),
      ]);
    const rules: EligibilityRules = {
      userId,
      blockedIds,
      engagedPostIds: signals.engagedPostIds,
      now,
      maxAgeDays: feedMaxAgeDays,
      eventPostMaxAgeDays: feedEventPostMaxAgeDays,
    };

    const authors = authorPriority(
      signals.signalsByAuthor,
      followedIds,
      new Set([userId, ...blockedIds]),
      feedAuthors,
    );
    const since = new Date(now.getTime() - feedMaxAgeDays * DAY_MS);
    const [authorPosts, ties] = await Promise.all([
      this.posts.recentByAuthors(authors, since),
      this.eventTies(userId, now, participatedIds, wishedIds),
    ]);
    const eventPosts = await this.posts.byIds([...ties.keys()]);

    const personalPosts = new Map<string, RankingPost>();
    for (const post of [...authorPosts, ...eventPosts]) {
      if (
        !personalPosts.has(post.id) &&
        isEligiblePost(post, ties.has(post.id), rules)
      ) {
        personalPosts.set(post.id, post);
      }
    }

    const globalPosts =
      feedGlobalEnabled && personalPosts.size < feedMinItems
        ? (await this.posts.recentGlobal(since)).filter(
            (post) =>
              !personalPosts.has(post.id) && isEligiblePost(post, false, rules),
          )
        : [];

    const followed = new Set(followedIds);
    const friends = await this.socialFeed.friendIds(
      userId,
      [
        ...new Set(
          [...personalPosts.values(), ...globalPosts].map(
            (post) => post.authorId,
          ),
        ),
      ].filter((authorId) => followed.has(authorId)),
    );
    const toCandidate = (
      post: RankingPost,
      origin: PostOrigin,
    ): FeedCandidate => ({
      post,
      origin,
      eventTie: ties.get(post.id) ?? 'NONE',
      signals: signals.signalsByAuthor.get(post.authorId) ?? [],
      followed: followed.has(post.authorId),
      friend: friends.has(post.authorId),
      alreadyEngaged: signals.engagedPostIds.has(post.id),
    });

    const personal = [...personalPosts.values()].map((post) =>
      toCandidate(post, this.originOf(post, ties, signals)),
    );
    const global = globalPosts.map((post) =>
      toCandidate(post, PostOrigin.GLOBAL),
    );
    this.logger.info(
      `Collected ${String(personal.length)} personal and ${String(global.length)} global post(s) for user ${userId} from ${String(authors.length)} author(s)`,
    );
    return { personal, global };
  }

  /** Lien evenement de chaque post lie a un evenement participe ou souhaite de l'utilisateur. */
  private async eventTies(
    userId: string,
    now: Date,
    participatedIds: readonly string[],
    wishedIds: readonly string[],
  ): Promise<Map<string, EventTieState>> {
    const participated = new Set(participatedIds);
    const wished = new Set(wishedIds);
    const events = await this.events.byIds([
      ...new Set([...participatedIds, ...wishedIds]),
    ]);
    const tied = events.flatMap((event) => {
      const tie = eventTieOf(
        event.id,
        event.startAt,
        now,
        participated,
        wished,
      );
      return tie === 'NONE' ? [] : [{ eventId: event.id, tie }];
    });
    const ties = new Map<string, EventTieState>();
    for (const wave of chunk(tied, EVENT_POSTS_CONCURRENCY)) {
      const postIdsPerEvent = await Promise.all(
        wave.map(async ({ eventId, tie }) => ({
          tie,
          postIds: await this.socialFeed.eventPostIds(eventId),
        })),
      );
      for (const { tie, postIds } of postIdsPerEvent) {
        for (const postId of postIds) {
          ties.set(postId, strongerTie(ties.get(postId) ?? 'NONE', tie));
        }
      }
    }
    this.logger.info(
      `User ${userId}: ${String(tied.length)} linked event(s), ${String(ties.size)} linked post(s)`,
    );
    return ties;
  }

  /** Origine retenue : lien evenement, puis auteur engage, puis auteur suivi. */
  private originOf(
    post: RankingPost,
    ties: ReadonlyMap<string, EventTieState>,
    signals: FeedSignals,
  ): PostOrigin {
    if (ties.has(post.id)) {
      return PostOrigin.EVENT;
    }
    return signals.signalsByAuthor.has(post.authorId)
      ? PostOrigin.ENGAGED
      : PostOrigin.FOLLOWED;
  }
}
