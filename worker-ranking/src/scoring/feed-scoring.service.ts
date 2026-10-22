import { Injectable } from '@nestjs/common';
import {
  RankingRunSource,
  postReasons,
  postScoreComponents,
  structuralPostScore,
} from '@volontariapp/domain-ranking';
import { CustomConfig } from '../config/custom-config.js';
import { HOUR_MS } from './constants/feed.constants.js';
import { rankFeed } from './helpers/rank-feed.helpers.js';
import type { CollectedPosts } from './interfaces/collected-posts.interface.js';
import type { FeedCandidate } from './interfaces/feed-candidate.interface.js';
import type { ScoredFeed } from './interfaces/scored-feed.interface.js';
import type { ScoredPost } from './interfaces/scored-post.interface.js';

/**
 * Score structurel des posts (docs/matching/13, section 2) : lien evenement 0,35, auteur 0,30,
 * fraicheur 0,35, retrogradation a 0 d'un post deja like ou commente, diversite par auteur, posts
 * personnels avant le complement GLOBAL. Jev est desactive pour le feed (aucun score semantique).
 */
@Injectable()
export class FeedScoringService {
  constructor(private readonly customConfig: CustomConfig) {}

  rank(collected: CollectedPosts, now: Date): ScoredFeed {
    const { feedListSize } = this.customConfig.ranking;
    const ordered = rankFeed(
      collected.personal.map((entry) => this.score(entry, now)),
      collected.global.map((entry) => this.score(entry, now)),
    ).slice(0, feedListSize);

    return {
      items: ordered.map((entry, index) => ({
        postId: entry.id,
        authorId: entry.authorId,
        origin: entry.origin,
        score: entry.score,
        structuralScore: entry.score,
        semanticScore: null,
        rank: index + 1,
        reasons: entry.reasons,
      })),
      source:
        collected.personal.length === 0
          ? RankingRunSource.COLD_START
          : RankingRunSource.STRUCTURAL_ONLY,
      candidateCount: collected.personal.length + collected.global.length,
    };
  }

  private score(entry: FeedCandidate, now: Date): ScoredPost {
    const components = postScoreComponents({
      ageHours: (now.getTime() - entry.post.createdAt.getTime()) / HOUR_MS,
      eventTie: entry.eventTie,
      signals: entry.signals,
      followed: entry.followed,
      friend: entry.friend,
      alreadyEngaged: entry.alreadyEngaged,
    });
    return {
      id: entry.post.id,
      authorId: entry.post.authorId,
      origin: entry.origin,
      score: structuralPostScore(components, entry.alreadyEngaged),
      reasons: postReasons({
        components,
        eventTie: entry.eventTie,
        followed: entry.followed,
        friend: entry.friend,
      }),
    };
  }
}
