import { Injectable } from '@nestjs/common';
import {
  RankingFeedbackService,
  RankingLocationService,
  originFromHistory,
} from '@volontariapp/domain-ranking';
import { Logger } from '@volontariapp/logger';
import { EventRankingClient } from '../clients/event-ranking.client.js';
import { SocialFeedClient } from '../clients/social-feed.client.js';
import { SocialRankingClient } from '../clients/social-ranking.client.js';
import { CustomConfig } from '../config/custom-config.js';
import { isFullEvent } from './helpers/is-full-event.helpers.js';
import type { CollectedEvents } from './interfaces/collected-events.interface.js';

/**
 * Etapes 3 a 5 du calcul : historique, exclusions, candidats de ms-event (source de verite) puis
 * intersection avec les evenements autorises par le graphe (blocages dans les deux sens).
 */
@Injectable()
export class EventCandidateService {
  private readonly logger = new Logger({ context: EventCandidateService.name });

  constructor(
    private readonly social: SocialRankingClient,
    private readonly socialFeed: SocialFeedClient,
    private readonly events: EventRankingClient,
    private readonly feedbackService: RankingFeedbackService,
    private readonly locationService: RankingLocationService,
    private readonly customConfig: CustomConfig,
  ) {}

  async collect(userId: string, now: Date): Promise<CollectedEvents> {
    const {
      historySize,
      excludeLimit,
      candidateLimit,
      passCooldownDays,
      locationKey,
    } = this.customConfig.ranking;

    const [participatedIds, wishedIds, passedIds, storedPosition] =
      await Promise.all([
        this.social.participatedEventIds(userId, excludeLimit),
        this.social.wishedEventIds(userId, excludeLimit),
        this.feedbackService.listRecentPassedEventIds(userId, passCooldownDays),
        this.locationService.findPosition(userId, locationKey),
      ]);

    const history = await this.events.byIds([
      ...new Set([
        ...participatedIds.slice(0, historySize),
        ...wishedIds.slice(0, historySize),
      ]),
    ]);
    const origin =
      storedPosition ??
      originFromHistory(
        history.flatMap((event) => (event.location ? [event.location] : [])),
      );

    const excluded = new Set([...participatedIds, ...wishedIds, ...passedIds]);
    const [upcoming, allowed, friendTouched] = await Promise.all([
      // The user's own events are left out by ms-event (organizerId), not listed by id.
      this.events.upcoming(
        now,
        candidateLimit,
        origin,
        [...excluded],
        [userId],
      ),
      this.graphAllowList(userId, [participatedIds.length, wishedIds.length]),
      this.social.friendTouchedEventIds(userId),
    ]);

    const allowedSet = allowed === null ? null : new Set(allowed);
    const candidates = upcoming.filter(
      (event) =>
        !excluded.has(event.id) &&
        (allowedSet === null || allowedSet.has(event.id)) &&
        !isFullEvent(event) &&
        event.startAt.getTime() > now.getTime(),
    );
    this.logger.info(
      `Collected ${String(candidates.length)} candidate(s) out of ${String(upcoming.length)} for user ${userId}`,
    );

    return {
      candidates,
      history,
      friendTouched: new Set(friendTouched),
      origin,
    };
  }

  /**
   * Evenements autorises par le graphe, ou null quand ce filtre n'apporte rien. Les exclusions
   * (crees, participes, souhaites) sont deja appliquees par ms-event ; seuls les blocages restent
   * propres au graphe. Sans blocage, on evite un parcours complet des evenements par utilisateur.
   * Une liste d'exclusion qui atteint `excludeLimit` est peut-etre tronquee : le graphe reste alors
   * le filet des exclusions au-dela de la limite.
   */
  private async graphAllowList(
    userId: string,
    exclusionListSizes: readonly number[],
  ): Promise<string[] | null> {
    const { excludeLimit } = this.customConfig.ranking;
    const mayBeTruncated = exclusionListSizes.some(
      (size) => size >= excludeLimit,
    );
    if (!mayBeTruncated && !(await this.hasBlocksOrAssume(userId))) {
      return null;
    }
    return this.social.allowedEventIds(userId);
  }

  /** En cas d'echec de la lecture, on suppose un blocage : le filtre complet reste le chemin sur. */
  private async hasBlocksOrAssume(userId: string): Promise<boolean> {
    try {
      return await this.socialFeed.hasBlocks(userId);
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.name : 'unknown error';
      this.logger.warn(
        `Block check failed for user ${userId} (${reason}), scanning the graph`,
      );
      return true;
    }
  }
}
