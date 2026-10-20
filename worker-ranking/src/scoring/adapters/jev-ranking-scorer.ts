import { Injectable, Optional } from '@nestjs/common';
import type {
  RankingCandidate,
  RankingScorer,
  TasteSummary,
} from '@volontariapp/domain-ranking';
import { Logger } from '@volontariapp/logger';
import { CustomConfig } from '../../config/custom-config.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { buildJevRequestBody } from './jev-payload.sanitizer.js';

export interface JevAnswerItem {
  readonly type?: string;
  readonly noul?: number;
}

export interface JevResponseUsage {
  readonly input_tokens?: number;
  readonly output_tokens?: number;
}

export interface JevResponseBody {
  readonly model?: string;
  readonly answers?: Record<string, JevAnswerItem>;
  readonly usage?: JevResponseUsage;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Adaptateur HTTP vers l'API TypeSafe AI Jev (POST /v1/systemone).
 * Gere les questions noul, les retries (429/529), la dichotomie sur 422,
 * le coupe-circuit et le repli structurel transparent.
 */
@Injectable()
export class JevRankingScorer implements RankingScorer {
  private readonly logger: Logger;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly config: CustomConfig,
    @Optional() logger?: Logger,
    @Optional() fetchFn?: typeof fetch,
  ) {
    this.logger = logger ?? new Logger({ context: JevRankingScorer.name });
    this.fetchImpl = fetchFn ?? globalThis.fetch;
    const ranking = this.config.ranking;
    this.circuitBreaker = new CircuitBreaker({
      threshold: ranking.jevCircuitBreakerThreshold,
      cooldownMs: ranking.jevCircuitBreakerCooldownMs,
    });
  }

  async score(
    taste: TasteSummary,
    candidates: readonly RankingCandidate[],
  ): Promise<ReadonlyMap<string, number>> {
    const apiKey = this.config.ranking.jevApiKey;
    if (!apiKey) {
      this.logger.info(
        'TYPESAFE_API_KEY is not defined, structural fallback (Noop)',
      );
      return new Map();
    }

    if (taste.history.length === 0 || candidates.length === 0) {
      return new Map();
    }

    if (!this.circuitBreaker.canExecute()) {
      this.logger.warn(
        'Jev circuit breaker is OPEN, fast fallback to structural-only ranking',
      );
      return new Map();
    }

    const limit = this.config.ranking.jevCandidatesLimit;
    const candidatesSlice = candidates.slice(0, limit);

    return this.evaluateCandidates(apiKey, taste, candidatesSlice, 0);
  }

  private async evaluateCandidates(
    apiKey: string,
    taste: TasteSummary,
    candidates: readonly RankingCandidate[],
    depth: number,
  ): Promise<ReadonlyMap<string, number>> {
    if (candidates.length === 0) {
      return new Map();
    }

    const url = this.config.ranking.jevBaseUrl;
    const timeoutMs = this.config.ranking.jevTimeoutMs;
    const model = this.config.ranking.jevModel;
    const body = buildJevRequestBody(model, taste, candidates);

    let lastErrorStatus: number | null = null;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const backoffMs = attempt === 1 ? 200 : 500;
        await sleep(backoffMs);
      }

      try {
        const response = await this.fetchImpl(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (response.ok) {
          const data = (await response.json()) as JevResponseBody;
          this.circuitBreaker.recordSuccess();
          if (data.usage) {
            this.logger.info(
              `Jev scoring successful: ${String(Object.keys(data.answers ?? {}).length)} candidate(s) scored, tokens: in=${String(data.usage.input_tokens ?? 0)} out=${String(data.usage.output_tokens ?? 0)}`,
            );
          }
          return this.parseAnswers(data.answers ?? {});
        }

        lastErrorStatus = response.status;

        // 401 : Cle invalide, aucun reessai, repli structurel immediat
        if (response.status === 401) {
          this.logger.error(
            'Jev authentication failed (401), invalid API key. Falling back to structural score.',
          );
          this.circuitBreaker.recordFailure();
          return new Map();
        }

        // 422 : Requete mal formee -> degradation par sous-lots (dichotomie)
        if (response.status === 422) {
          return await this.handle422Bisection(
            apiKey,
            taste,
            candidates,
            depth,
          );
        }

        // 429 ou 529 : limite de debit ou surcharge temporaire -> retry avec backoff
        if (response.status === 429 || response.status === 529) {
          this.logger.warn(
            `Jev transient error ${String(response.status)} on attempt ${String(attempt + 1)}/${String(maxRetries + 1)}`,
          );
          continue;
        }

        // Autre erreur HTTP (500, 502, 503...)
        this.logger.error(
          `Jev unexpected HTTP error ${String(response.status)}: structural fallback`,
        );
        this.circuitBreaker.recordFailure();
        return new Map();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Jev request failure on attempt ${String(attempt + 1)}: ${message}`,
        );
      }
    }

    this.logger.error(
      `Jev retries exhausted (last status: ${String(lastErrorStatus)}), falling back to structural score`,
    );
    this.circuitBreaker.recordFailure();
    return new Map();
  }

  /**
   * En cas de 422, divise le lot de questions en deux pour isoler la question invalide
   * sans perdre les questions valides.
   */
  private async handle422Bisection(
    apiKey: string,
    taste: TasteSummary,
    candidates: readonly RankingCandidate[],
    depth: number,
  ): Promise<ReadonlyMap<string, number>> {
    // Si profondeur trop grande ou un seul candidat, on abandonne ce candidat specifique
    if (candidates.length <= 1 || depth >= 4) {
      const rejectedId = candidates[0]?.eventId ?? 'unknown';
      this.logger.error(
        `Jev 422: isolated unprocessable candidate question for event ${rejectedId}, dropping question`,
      );
      this.circuitBreaker.recordFailure();
      return new Map();
    }

    this.logger.warn(
      `Jev 422 unprocessable entity: bisecting batch of ${String(candidates.length)} candidate(s) (depth ${String(depth)})`,
    );

    const mid = Math.floor(candidates.length / 2);
    const left = candidates.slice(0, mid);
    const right = candidates.slice(mid);

    const [leftMap, rightMap] = await Promise.all([
      this.evaluateCandidates(apiKey, taste, left, depth + 1),
      this.evaluateCandidates(apiKey, taste, right, depth + 1),
    ]);

    const merged = new Map<string, number>();
    for (const [k, v] of leftMap) {
      merged.set(k, v);
    }
    for (const [k, v] of rightMap) {
      merged.set(k, v);
    }
    return merged;
  }

  private parseAnswers(
    answers: Record<string, JevAnswerItem>,
  ): ReadonlyMap<string, number> {
    const scores = new Map<string, number>();
    for (const [eventId, item] of Object.entries(answers)) {
      if (typeof item.noul === 'number' && !Number.isNaN(item.noul)) {
        // Borner la probabilite strictement entre 0 et 1
        const bounded = Math.max(0, Math.min(1, item.noul));
        scores.set(eventId, bounded);
      }
    }
    return scores;
  }
}
