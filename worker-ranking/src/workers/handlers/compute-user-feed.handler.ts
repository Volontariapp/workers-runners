import { Injectable } from '@nestjs/common';
import {
  FEED_FORMULA_VERSION,
  RankingListKind,
  RankingPostScoreService,
  RankingRequestService,
  RankingRunService,
} from '@volontariapp/domain-ranking';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType, type JobRegistry } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import { RankingJobWriter } from '../../domain/ranking-job-writer.js';
import { FeedCandidateService } from '../../scoring/feed-candidate.service.js';
import { FeedScoringService } from '../../scoring/feed-scoring.service.js';
import type { IJobHandler } from './interfaces/job-handler.interface.js';
import type { ComputeFeedJobType } from './types/compute-feed-job.type.js';

/**
 * Calcule la liste de posts d'un utilisateur (docs/matching/11), dans le meme ordre normatif que les
 * evenements : coalescence, horloge de la base, signaux et candidats, score, ecriture avec job de suite.
 */
@Injectable()
export class ComputeUserFeedHandler implements IJobHandler<ComputeFeedJobType> {
  private readonly logger = new Logger({
    context: ComputeUserFeedHandler.name,
  });

  public readonly jobType = JobMessagingType.COMPUTE_USER_FEED;

  constructor(
    private readonly runService: RankingRunService,
    private readonly requestService: RankingRequestService,
    private readonly postScoreService: RankingPostScoreService,
    private readonly candidates: FeedCandidateService,
    private readonly scoring: FeedScoringService,
    private readonly jobWriter: RankingJobWriter,
  ) {}

  async handle(
    job: JobOf<ComputeFeedJobType>,
  ): Promise<{ originalPayload: JobRegistry[ComputeFeedJobType] }> {
    const payload = job.data.payload;
    const { userId, reason, requestedAt } = payload;

    // Etape 0 : sauter seulement si un calcul commence apres cette demande a deja ecrit une liste.
    const upToDate = await this.runService.isUpToDate({
      userId,
      listKind: RankingListKind.POST,
      requestedAt,
      formulaVersion: FEED_FORMULA_VERSION,
    });
    if (upToDate) {
      this.logger.info(
        `Job ${String(job.id)} skipped: a newer feed exists for user ${userId}`,
      );
      return { originalPayload: payload };
    }

    // Etape 1 : l'horloge de la base, en texte, la meme que ranking_request.requested_at.
    const startedAt = await this.requestService.databaseClock();
    const began = Date.now();
    const now = new Date();

    // Etapes 2 a 6 : jeton interne, signaux reconcilies, auteurs et candidats, filtres, score.
    const collected = await this.candidates.collect(userId, now);
    const scored = this.scoring.rank(collected, now);

    // Etape 8 : ecriture transactionnelle (retention du journal de likes incluse), job de suite si besoin.
    const result = await this.postScoreService.replaceList(
      {
        userId,
        startedAt,
        items: scored.items,
        run: {
          source: scored.source,
          formulaVersion: FEED_FORMULA_VERSION,
          reason,
          candidateCount: scored.candidateCount,
          jevScoredCount: 0,
          durationMs: Date.now() - began,
        },
      },
      async (manager, written) => {
        if (written.followUpRequired && written.followUpRequestedAt) {
          await this.jobWriter.insertFollowUp(manager, {
            userId,
            listKind: RankingListKind.POST,
            reason,
            requestedAt: written.followUpRequestedAt,
          });
        }
      },
    );
    this.logger.info(
      `Feed of user ${userId}: written=${String(result.written)}, ${String(scored.items.length)} item(s), source=${scored.source}, follow-up=${String(result.followUpRequired)}`,
    );

    return { originalPayload: payload };
  }
}
