import { createMock } from '@volontariapp/testing';
import type { JobOf } from '@volontariapp/workers';
import type { JobMessagingType } from '@volontariapp/messaging';
import type { RankingEvent } from '../../clients/interfaces/ranking-event.interface.js';
import type { CustomConfig } from '../../config/custom-config.js';

export const USER_ID = '11111111-1111-4111-a111-111111111111';
export const NOW = new Date('2026-10-19T10:00:00.000Z');
export const PARIS = { lat: 48.8566, lng: 2.3522 };
export const LYON = { lat: 45.764, lng: 4.8357 };

const DAY_MS = 24 * 60 * 60 * 1000;

export const buildRankingEvent = (
  id: string,
  overrides: Partial<RankingEvent> = {},
): RankingEvent => ({
  id,
  name: `Event ${id}`,
  summary: `Summary of ${id}`,
  type: 'SOCIAL',
  tags: ['garden'],
  startAt: new Date(NOW.getTime() + 3 * DAY_MS),
  location: PARIS,
  currentParticipants: 3,
  maxParticipants: 20,
  ...overrides,
});

export const buildConfig = (
  overrides: Partial<CustomConfig['ranking']> = {},
): CustomConfig =>
  ({
    ranking: {
      listSize: 100,
      candidateLimit: 150,
      historySize: 2,
      excludeLimit: 500,
      passCooldownDays: 30,
      activeDays: 30,
      maxFanout: 1000,
      buzzWindowDays: 14,
      requestTtlSeconds: 120,
      debounceSeconds: 30,
      workerConcurrency: 5,
      locationKey: 'test-only-location-key-32-bytes!',
      feedListSize: 100,
      feedAuthors: 200,
      feedMaxAgeDays: 7,
      feedEventPostMaxAgeDays: 30,
      feedMaxFanout: 200,
      feedMinItems: 20,
      feedLikesLimit: 200,
      feedGlobalEnabled: true,
      jevApiKey: undefined,
      jevBaseUrl: 'https://api.typesafe.ai/v1/systemone',
      jevTimeoutMs: 10000,
      jevModel: 'jev-latest',
      jevCandidatesLimit: 30,
      jevCircuitBreakerThreshold: 3,
      jevCircuitBreakerCooldownMs: 60000,
      ...overrides,
    },
  }) as CustomConfig;

export const buildJob = <K extends JobMessagingType>(
  payload: unknown,
  id = 'job-1',
): JobOf<K> => {
  const job = createMock<JobOf<K>>();
  Object.defineProperty(job, 'data', { value: { payload } });
  Object.defineProperty(job, 'id', { value: id });
  return job;
};
