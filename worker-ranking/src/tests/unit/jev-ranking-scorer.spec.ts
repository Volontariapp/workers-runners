import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import type {
  RankingCandidate,
  TasteSummary,
} from '@volontariapp/domain-ranking';
import { Logger } from '@volontariapp/logger';
import { JevRankingScorer } from '../../scoring/adapters/jev-ranking-scorer.js';
import { buildConfig } from '../factories/ranking.factory.js';

describe('JevRankingScorer (Unit)', () => {
  const logger = new Logger({ context: 'JevRankingScorerSpec' });
  const mockCandidateA: RankingCandidate = {
    eventId: 'evt-1',
    name: 'Nettoyage de plage',
    type: 'ECOLOGY',
    tags: ['nature', 'plage'],
    summary: 'Ramassage citoyen des dechets sur la cote.',
  };
  const mockCandidateB: RankingCandidate = {
    eventId: 'evt-2',
    name: 'Distribution de repas',
    type: 'SOCIAL',
    tags: ['entraide', 'repas'],
    summary: 'Maraude solidaire.',
  };

  const sampleTaste: TasteSummary = {
    ecologyShare: 0.6,
    socialShare: 0.4,
    history: [mockCandidateA],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty map if jevEnabled is false', async () => {
    const config = buildConfig({ jevEnabled: false, jevApiKey: 'valid-key' });
    const scorer = new JevRankingScorer(config, logger);

    const scores = await scorer.score(sampleTaste, [mockCandidateA]);
    expect(scores.size).toBe(0);
  });

  it('returns empty map if jevApiKey is not configured (Noop mode)', async () => {
    const config = buildConfig({ jevApiKey: undefined });
    const scorer = new JevRankingScorer(config, logger);

    const scores = await scorer.score(sampleTaste, [mockCandidateA]);
    expect(scores.size).toBe(0);
  });

  it('returns empty map if candidates or history are empty', async () => {
    const config = buildConfig({ jevApiKey: 'test-key' });
    const scorer = new JevRankingScorer(config, logger);

    expect((await scorer.score(sampleTaste, [])).size).toBe(0);
    expect(
      (
        await scorer.score({ ecologyShare: 0, socialShare: 0, history: [] }, [
          mockCandidateA,
        ])
      ).size,
    ).toBe(0);
  });

  it('scores candidates on nominal 200 OK response', async () => {
    const mockFetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          model: 'jev-latest',
          answers: {
            'evt-1': { type: 'noul', noul: 0.85 },
            'evt-2': { type: 'noul', noul: 0.2 },
          },
          usage: { input_tokens: 150, output_tokens: 2 },
        }),
    } as Response);

    const config = buildConfig({ jevApiKey: 'valid-key' });
    const scorer = new JevRankingScorer(config, logger, mockFetch);

    const scores = await scorer.score(sampleTaste, [
      mockCandidateA,
      mockCandidateB,
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(scores.size).toBe(2);
    expect(scores.get('evt-1')).toBe(0.85);
    expect(scores.get('evt-2')).toBe(0.2);
  });

  it('falls back to structural on 401 Unauthorized without retrying', async () => {
    const mockFetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    } as Response);

    const config = buildConfig({ jevApiKey: 'bad-key' });
    const scorer = new JevRankingScorer(config, logger, mockFetch);

    const scores = await scorer.score(sampleTaste, [mockCandidateA]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(scores.size).toBe(0);
  });

  it('retries on transient 429 and succeeds on second attempt', async () => {
    const mockFetch = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Rate limit' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            model: 'jev-latest',
            answers: { 'evt-1': { type: 'noul', noul: 0.9 } },
          }),
      } as Response);

    const config = buildConfig({ jevApiKey: 'valid-key' });
    const scorer = new JevRankingScorer(config, logger, mockFetch);

    const scores = await scorer.score(sampleTaste, [mockCandidateA]);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(scores.get('evt-1')).toBe(0.9);
  });

  it('bisects batch on 422 to salvage valid candidates and isolate the rejected candidate', async () => {
    // Premier appel avec [evt-1, evt-2] renvoie 422
    // Appel sous-lot [evt-1] reussit (200)
    // Appel sous-lot [evt-2] renvoie 422 puis est isole et abandonne
    const mockFetch = jest
      .fn<typeof fetch>()
      .mockImplementation((_url, init) => {
        const rawBody = typeof init?.body === 'string' ? init.body : '{}';
        const body = JSON.parse(rawBody) as {
          questions?: Record<string, unknown>;
        };
        const keys = Object.keys(body.questions ?? {});

        if (keys.includes('evt-2')) {
          return Promise.resolve({
            ok: false,
            status: 422,
            json: () => Promise.resolve({ error: 'Invalid candidate text' }),
          } as Response);
        }

        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              model: 'jev-latest',
              answers: { 'evt-1': { type: 'noul', noul: 0.77 } },
            }),
        } as Response);
      });

    const config = buildConfig({ jevApiKey: 'valid-key' });
    const scorer = new JevRankingScorer(config, logger, mockFetch);

    const scores = await scorer.score(sampleTaste, [
      mockCandidateA,
      mockCandidateB,
    ]);

    expect(scores.get('evt-1')).toBe(0.77);
    expect(scores.has('evt-2')).toBe(false);
  });

  it('fast-falls back when circuit breaker trips after repeated failures', async () => {
    const mockFetch = jest
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('Network error'));

    const config = buildConfig({
      jevApiKey: 'valid-key',
      jevCircuitBreakerThreshold: 2,
    });
    const scorer = new JevRankingScorer(config, logger, mockFetch);

    // 1ere tentative : echoue (3 retries internes)
    await scorer.score(sampleTaste, [mockCandidateA]);
    // 2eme tentative : echoue -> le breaker bascule en OPEN
    await scorer.score(sampleTaste, [mockCandidateA]);

    const callsCount = mockFetch.mock.calls.length;

    // 3eme tentative : le breaker est OPEN -> aucun appel fetch
    const scores = await scorer.score(sampleTaste, [mockCandidateA]);
    expect(scores.size).toBe(0);
    expect(mockFetch.mock.calls.length).toBe(callsCount);
  });
});
