import 'reflect-metadata';
import { describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { PostgresProvider } from '@volontariapp/bridge';
import {
  RankingFeedbackService,
  RankingLikeLogModel,
  RankingLikeLogService,
  RankingLocationService,
  RankingMentionService,
  RankingPostScoreModel,
  RankingPostScoreService,
  RankingRequestService,
  RankingRunService,
  RankingScoreService,
  RankingWishService,
} from '@volontariapp/domain-ranking';
import { rankingDomainProviders } from '../../domain/ranking-domain.providers.js';
import { createMockPostgresProvider } from '../mocks/postgres.mock.js';

const tokenOf = (provider: (typeof rankingDomainProviders)[number]): unknown =>
  typeof provider === 'function' ? provider : provider.provide;

describe('rankingDomainProviders (Unit)', () => {
  it('declares each token once and no TypeORM model as a provider', () => {
    const tokens = rankingDomainProviders.map(tokenOf);

    expect(new Set(tokens).size).toBe(tokens.length);
    expect(tokens).not.toContain(RankingLikeLogModel);
    expect(tokens).not.toContain(RankingPostScoreModel);
  });

  it('resolves every domain service on repositories built from the worker data source', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: PostgresProvider, useValue: createMockPostgresProvider() },
        ...rankingDomainProviders,
      ],
    }).compile();

    for (const service of [
      RankingRunService,
      RankingRequestService,
      RankingScoreService,
      RankingPostScoreService,
      RankingLikeLogService,
      RankingLocationService,
      RankingFeedbackService,
      RankingWishService,
      RankingMentionService,
    ]) {
      expect(moduleRef.get(service)).toBeInstanceOf(service);
    }
  });
});
