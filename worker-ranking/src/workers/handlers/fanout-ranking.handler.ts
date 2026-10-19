import { Injectable } from '@nestjs/common';
import {
  RankingListKind,
  RankingRunService,
  type ActiveUsersCursor,
} from '@volontariapp/domain-ranking';
import { Logger } from '@volontariapp/logger';
import { JobMessagingType, type JobRegistry } from '@volontariapp/messaging';
import type { JobOf } from '@volontariapp/workers';
import { SocialFeedClient } from '../../clients/social-feed.client.js';
import { SocialRankingClient } from '../../clients/social-ranking.client.js';
import { CustomConfig } from '../../config/custom-config.js';
import type { ComputeRequest } from '../../domain/interfaces/compute-request.interface.js';
import { RankingJobWriter } from '../../domain/ranking-job-writer.js';
import { ACTIVE_USERS_PAGE } from './constants/fanout-ranking.constants.js';
import type { IJobHandler } from './interfaces/job-handler.interface.js';
import type { FanoutJobType } from './types/fanout-job.type.js';

/** Transforme un evenement de plateforme en demandes de calcul, une par utilisateur concerne. */
@Injectable()
export class FanoutRankingHandler implements IJobHandler<FanoutJobType> {
  private readonly logger = new Logger({ context: FanoutRankingHandler.name });

  public readonly jobType = JobMessagingType.FANOUT_RANKING;

  constructor(
    private readonly runService: RankingRunService,
    private readonly social: SocialRankingClient,
    private readonly socialFeed: SocialFeedClient,
    private readonly jobWriter: RankingJobWriter,
    private readonly customConfig: CustomConfig,
  ) {}

  async handle(
    job: JobOf<FanoutJobType>,
  ): Promise<{ originalPayload: JobRegistry[FanoutJobType] }> {
    const payload = job.data.payload;

    const requests =
      payload.trigger === 'POST_CREATED'
        ? await this.activeFollowers(payload.authorId)
        : payload.trigger === 'EVENT_CREATED'
          ? await this.activeUsers('EVENT_CREATED')
          : await this.participants(payload.eventId);

    if (requests.length > 0) {
      await this.jobWriter.requestCompute(requests);
    }
    this.logger.info(
      `Fan-out ${payload.trigger} of job ${String(job.id)}: ${String(requests.length)} request(s)`,
    );
    return { originalPayload: payload };
  }

  /** Utilisateurs actifs (liste d'evenements recente), du plus actif au moins actif, plafonnes. */
  private async activeUsers(
    reason: 'EVENT_CREATED',
  ): Promise<ComputeRequest[]> {
    const { activeDays, maxFanout } = this.customConfig.ranking;
    const requests: ComputeRequest[] = [];
    let after: ActiveUsersCursor | undefined;
    while (requests.length < maxFanout) {
      const page = await this.runService.listActiveUsers({
        listKind: RankingListKind.EVENT,
        days: activeDays,
        limit: Math.min(ACTIVE_USERS_PAGE, maxFanout - requests.length),
        after,
      });
      requests.push(
        ...page.map(({ userId }) => ({
          userId,
          listKind: RankingListKind.EVENT,
          reason,
        })),
      );
      const last = page.at(-1);
      if (!last || page.length < ACTIVE_USERS_PAGE) {
        break;
      }
      after = { computedAt: last.computedAt, userId: last.userId };
    }
    return requests;
  }

  /**
   * Abonnes de l'auteur d'un nouveau post (docs/matching/11, section 7) : pagines par 50 jusqu'au
   * plafond, intersectes avec les utilisateurs actifs du feed, dedupliques, sans l'auteur.
   */
  private async activeFollowers(
    authorId: string | undefined,
  ): Promise<ComputeRequest[]> {
    if (!authorId) {
      this.logger.warn('POST_CREATED fan-out without authorId, ignored');
      return [];
    }
    const { activeDays, feedMaxFanout } = this.customConfig.ranking;
    const followers = new Set(
      await this.socialFeed.followerIds(authorId, feedMaxFanout),
    );
    followers.delete(authorId);
    const requests: ComputeRequest[] = [];
    let after: ActiveUsersCursor | undefined;
    while (followers.size > 0) {
      const page = await this.runService.listActiveUsers({
        listKind: RankingListKind.POST,
        days: activeDays,
        limit: ACTIVE_USERS_PAGE,
        after,
      });
      for (const { userId } of page) {
        if (followers.delete(userId)) {
          requests.push({
            userId,
            listKind: RankingListKind.POST,
            reason: 'POST_PUBLISHED',
          });
        }
      }
      const last = page.at(-1);
      if (!last || page.length < ACTIVE_USERS_PAGE) {
        break;
      }
      after = { computedAt: last.computedAt, userId: last.userId };
    }
    return requests;
  }

  /** Participants d'un evenement termine, sans plafond : leur historique a change. */
  private async participants(
    eventId: string | undefined,
  ): Promise<ComputeRequest[]> {
    if (!eventId) {
      this.logger.warn('EVENT_FINISHED fan-out without eventId, ignored');
      return [];
    }
    const userIds = await this.social.eventParticipantIds(eventId);
    return userIds.map((userId) => ({
      userId,
      listKind: RankingListKind.EVENT,
      reason: 'EVENT_FINISHED' as const,
    }));
  }
}
