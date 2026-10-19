import { Inject, Injectable } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import { PostgresProvider } from '@volontariapp/bridge';
import { JobsOutboxEntity, JobsOutboxModel } from '@volontariapp/database';
import { RankingRequestService } from '@volontariapp/domain-ranking';
import { Logger } from '@volontariapp/logger';
import { JobsOutboxRepository } from '@volontariapp/outbox';
import { CustomConfig } from '../config/custom-config.js';
import {
  BACKGROUND_QUEUE,
  COMPUTE_JOB_TYPE,
  JOB_EMITTER,
} from './constants/ranking-job.constants.js';
import type { ComputeRequest } from './interfaces/compute-request.interface.js';
import type { FollowUpJob } from './interfaces/follow-up-job.interface.js';

/**
 * Ecrit les jobs de calcul dans jobs_outbox : une demande par utilisateur (fan-out) ou le job de
 * suite d'un calcul pendant lequel une demande est arrivee.
 */
@Injectable()
export class RankingJobWriter {
  private readonly logger = new Logger({ context: RankingJobWriter.name });

  constructor(
    @Inject(PostgresProvider) private readonly postgres: PostgresProvider,
    private readonly requestService: RankingRequestService,
    private readonly customConfig: CustomConfig,
  ) {}

  private get dataSource(): DataSource {
    return this.postgres.getDriver();
  }

  /** Une demande de fond par utilisateur, dans une seule transaction. */
  async requestCompute(requests: readonly ComputeRequest[]): Promise<void> {
    const { requestTtlSeconds } = this.customConfig.ranking;
    await this.dataSource.transaction(async (manager) => {
      for (const { userId, listKind, reason } of requests) {
        const { requestedAt, needsJob } =
          await this.requestService.requestCompute(
            {
              userId,
              listKind,
              reason,
              force: false,
              ttlSeconds: requestTtlSeconds,
            },
            manager,
          );
        if (needsJob) {
          await this.insert(manager, { userId, listKind, reason, requestedAt });
        }
      }
    });
    this.logger.info(`Queued ${String(requests.length)} compute request(s)`);
  }

  /** Dans la transaction d'ecriture de la liste : la ligne ranking_request a deja ete avancee. */
  insertFollowUp(manager: EntityManager, job: FollowUpJob): Promise<void> {
    return this.insert(manager, job);
  }

  private async insert(
    manager: EntityManager,
    { userId, listKind, reason, requestedAt }: FollowUpJob,
  ): Promise<void> {
    const delayMs = this.customConfig.ranking.debounceSeconds * 1000;
    const job = JobsOutboxEntity.createJob({
      type: COMPUTE_JOB_TYPE[listKind],
      emitter: JOB_EMITTER,
      emitterId: userId,
      scheduledAt: new Date(Date.now() + delayMs),
      target: BACKGROUND_QUEUE[listKind],
      payload: { userId, reason, requestedAt },
    });
    // Les interfaces de payload de messaging n'ont pas de signature d'index, le depot attend un JSON.
    await new JobsOutboxRepository(
      manager.getRepository(JobsOutboxModel),
    ).create({
      id: job.id,
      status: job.status,
      attempts: job.attempts,
      type: job.type,
      emitter: job.emitter,
      emitterId: job.emitterId,
      target: job.target,
      scheduledAt: job.scheduledAt,
      payload: { userId, reason, requestedAt },
    });
  }
}
