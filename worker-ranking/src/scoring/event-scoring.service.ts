import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_SEMANTIC_WEIGHT,
  RankingFeedbackService,
  RankingMentionService,
  RankingWishService,
  assignRanks,
  blendScores,
  computePopularity,
  eventReasons,
  eventScoreComponents,
  haversineKm,
  isWithinRange,
  structuralEventScore,
  type RankedEventItem,
  type RankingCandidate,
  type RankingScorer,
  type TasteSummary,
} from '@volontariapp/domain-ranking';
import { Logger } from '@volontariapp/logger';
import type { RankingEvent } from '../clients/ranking-event.js';
import { CustomConfig } from '../config/custom-config.js';
import type { CollectedEvents } from './event-candidate.service.js';

export const RANKING_SCORER = 'RANKING_SCORER';

export interface ScoredList {
  items: RankedEventItem[];
  /** FULL quand le scoreur semantique a repondu, STRUCTURAL_ONLY sinon. */
  source: 'FULL' | 'STRUCTURAL_ONLY';
  candidateCount: number;
  semanticScoredCount: number;
}

const tasteOf = (history: readonly RankingEvent[]): TasteSummary => {
  const ecology = history.filter((event) => event.type === 'ECOLOGY').length;
  const total = history.length;
  return {
    ecologyShare: total === 0 ? 0 : ecology / total,
    socialShare: total === 0 ? 0 : (total - ecology) / total,
    history: history.map(toScorerCandidate),
  };
};

const toScorerCandidate = (event: RankingEvent): RankingCandidate => ({
  eventId: event.id,
  name: event.name,
  type: event.type,
  tags: event.tags,
  summary: event.summary,
});

/** Etapes 6 et 7 : score structurel, codes d'explication, score semantique optionnel, rangs. */
@Injectable()
export class EventScoringService {
  private readonly logger = new Logger({ context: EventScoringService.name });

  constructor(
    private readonly wishService: RankingWishService,
    private readonly feedbackService: RankingFeedbackService,
    private readonly mentionService: RankingMentionService,
    @Inject(RANKING_SCORER) private readonly scorer: RankingScorer,
    private readonly customConfig: CustomConfig,
  ) {}

  async rank(collected: CollectedEvents, now: Date): Promise<ScoredList> {
    const { candidates, history, friendTouched, origin } = collected;
    const { listSize, buzzWindowDays } = this.customConfig.ranking;
    const ids = candidates.map((event) => event.id);
    const [wishes, passes, mentions] = await Promise.all([
      this.wishService.countByEvents(ids),
      this.feedbackService.countPasses(ids),
      this.mentionService.countDistinctAuthors(ids, buzzWindowDays),
    ]);

    const structural = candidates.flatMap((event) => {
      const distanceKm =
        origin && event.location ? haversineKm(origin, event.location) : null;
      if (!isWithinRange(distanceKm)) {
        return [];
      }
      const components = eventScoreComponents({
        now,
        startAt: event.startAt,
        distanceKm,
        touchedByFriend: friendTouched.has(event.id),
        type: event.type,
        tags: event.tags,
        history,
        popularity: computePopularity({
          wishes: wishes.get(event.id) ?? 0,
          passes: passes.get(event.id) ?? 0,
          currentParticipants: event.currentParticipants,
          maxParticipants: event.maxParticipants,
          mentionAuthors: mentions.get(event.id) ?? 0,
        }),
      });
      return [
        {
          event,
          structuralScore: structuralEventScore(components),
          reasons: eventReasons(components),
        },
      ];
    });

    const semantic = await this.semanticScores(
      history,
      structural.map(({ event }) => event),
    );
    const scored = structural.map((entry) => ({
      id: entry.event.id,
      score: blendScores(
        entry.structuralScore,
        semantic.get(entry.event.id),
        EVENT_SEMANTIC_WEIGHT,
      ),
      structuralScore: entry.structuralScore,
      semanticScore: semantic.get(entry.event.id) ?? null,
      reasons: entry.reasons,
    }));

    return {
      items: assignRanks(scored, listSize).map((entry) => ({
        eventId: entry.id,
        score: entry.score,
        structuralScore: entry.structuralScore,
        semanticScore: entry.semanticScore,
        rank: entry.rank,
        reasons: entry.reasons,
      })),
      source: semantic.size > 0 ? 'FULL' : 'STRUCTURAL_ONLY',
      candidateCount: structural.length,
      semanticScoredCount: semantic.size,
    };
  }

  /** Toute erreur du scoreur donne le repli structurel : la liste n'est jamais bloquee par Jev. */
  private async semanticScores(
    history: readonly RankingEvent[],
    candidates: readonly RankingEvent[],
  ): Promise<ReadonlyMap<string, number>> {
    try {
      return await this.scorer.score(
        tasteOf(history),
        candidates.map(toScorerCandidate),
      );
    } catch (error: unknown) {
      this.logger.warn(
        `Semantic scorer unavailable, structural-only list: ${error instanceof Error ? error.message : String(error)}`,
      );
      return new Map();
    }
  }
}
