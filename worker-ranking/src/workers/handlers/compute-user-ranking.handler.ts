import { Injectable } from '@nestjs/common';
import {
  FORMULA_VERSION,
  RankingListKind,
  RankingRequestService,
  RankingRunService,
  RankingScoreService,
} from '@volontariapp/domain-ranking';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType, type JobRegistry } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import { RankingJobWriter } from '../../domain/ranking-job-writer.js';
import { EventCandidateService } from '../../scoring/event-candidate.service.js';
import { EventScoringService } from '../../scoring/event-scoring.service.js';
import type { IJobHandler } from './job-handler.interface.js';

type ComputeJobType = typeof JobMessagingType.COMPUTE_USER_RANKING;

/**
 * Calcule la liste d'evenements d'un utilisateur (docs/matching/04, section 5). Ordre normatif :
 * coalescence, mesure, historique et candidats, score, ecriture avec job de suite.
 */
@Injectable()
export class ComputeUserRankingHandler implements IJobHandler<ComputeJobType> {
  private readonly logger = new Logger({
    context: ComputeUserRankingHandler.name,
  });

  public readonly jobType = JobMessagingType.COMPUTE_USER_RANKING;

  constructor(
    private readonly runService: RankingRunService,
    private readonly requestService: RankingRequestService,
    private readonly scoreService: RankingScoreService,
    private readonly candidates: EventCandidateService,
    private readonly scoring: EventScoringService,
    private readonly jobWriter: RankingJobWriter,
  ) {}

  async handle(
    job: JobOf<ComputeJobType>,
  ): Promise<{ originalPayload: JobRegistry[ComputeJobType] }> {
    const payload = job.data.payload;
    const { userId, reason, requestedAt } = payload;

    // Etape 0 : sauter seulement si un calcul commence apres cette demande a deja ecrit une liste.
    const upToDate = await this.runService.isUpToDate({
      userId,
      listKind: RankingListKind.EVENT,
      requestedAt,
      formulaVersion: FORMULA_VERSION,
    });
    if (upToDate) {
      this.logger.info(
        `Job ${String(job.id)} skipped: a newer list exists for user ${userId}`,
      );
      return { originalPayload: payload };
    }

    // Etape 1 : l'horloge de la base, en texte, la meme que ranking_request.requested_at.
    const startedAt = await this.requestService.databaseClock();
    const began = Date.now();
    const now = new Date();

    // Etapes 2 a 7 : jeton interne, historique, candidats, graphe, score.
    const collected = await this.candidates.collect(userId, now);
    const scored = await this.scoring.rank(collected, now);

    // Etape 8 : ecriture transactionnelle, avec un job de suite si une demande est arrivee pendant le calcul.
    const result = await this.scoreService.replaceList(
      {
        userId,
        startedAt,
        items: scored.items,
        run: {
          source: scored.source,
          formulaVersion: FORMULA_VERSION,
          reason,
          candidateCount: scored.candidateCount,
          jevScoredCount: scored.semanticScoredCount,
          durationMs: Date.now() - began,
        },
      },
      async (manager, written) => {
        if (written.followUpRequired && written.followUpRequestedAt) {
          await this.jobWriter.insertFollowUp(manager, {
            userId,
            listKind: RankingListKind.EVENT,
            reason,
            requestedAt: written.followUpRequestedAt,
          });
        }
      },
    );
    this.logger.info(
      `List of user ${userId}: written=${String(result.written)}, ${String(scored.items.length)} item(s), follow-up=${String(result.followUpRequired)}`,
    );

    // Etape 9.
    return { originalPayload: payload };
  }
}
