import { Injectable } from '@nestjs/common';
import {
  RankingFeedbackService,
  RankingLocationService,
  originFromHistory,
} from '@volontariapp/domain-ranking';
import { Logger } from '@volontariapp/logger';
import { EventRankingClient } from '../clients/event-ranking.client.js';
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

    const [participatedIds, wishedIds, createdIds, passedIds, storedPosition] =
      await Promise.all([
        this.social.participatedEventIds(userId, excludeLimit),
        this.social.wishedEventIds(userId, excludeLimit),
        this.social.createdEventIds(userId, excludeLimit),
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

    const excluded = new Set([
      ...participatedIds,
      ...wishedIds,
      ...createdIds,
      ...passedIds,
    ]);
    const [upcoming, allowed, friendTouched] = await Promise.all([
      this.events.upcoming(now, candidateLimit, origin, [...excluded]),
      this.social.allowedEventIds(userId),
      this.social.friendTouchedEventIds(userId),
    ]);

    const allowedSet = new Set(allowed);
    const candidates = upcoming.filter(
      (event) =>
        !excluded.has(event.id) &&
        allowedSet.has(event.id) &&
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
}
