import 'reflect-metadata';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { EventCandidateService } from '../../scoring/event-candidate.service.js';
import {
  NOW,
  PARIS,
  USER_ID,
  buildConfig,
  buildRankingEvent,
} from '../factories/ranking.factory.js';
import { createMockSocialFeedClient } from '../mocks/feed.mock.js';
import {
  createMockEventClient,
  createMockFeedbackService,
  createMockLocationService,
  createMockSocialClient,
} from '../mocks/ranking.mock.js';

describe('EventCandidateService (Unit)', () => {
  const social = createMockSocialClient();
  const socialFeed = createMockSocialFeedClient();
  const events = createMockEventClient();
  const feedbackService = createMockFeedbackService();
  const locationService = createMockLocationService();
  let service: EventCandidateService;
  let upcomingSpy: jest.SpiedFunction<typeof events.upcoming>;
  let byIdsSpy: jest.SpiedFunction<typeof events.byIds>;
  let findPositionSpy: jest.SpiedFunction<typeof locationService.findPosition>;
  let hasBlocksSpy: jest.SpiedFunction<typeof socialFeed.hasBlocks>;

  beforeEach(() => {
    service = new EventCandidateService(
      social,
      socialFeed,
      events,
      feedbackService,
      locationService,
      buildConfig({ historySize: 1 }),
    );
    jest.spyOn(social, 'participatedEventIds').mockResolvedValue(['p1', 'p2']);
    jest.spyOn(social, 'wishedEventIds').mockResolvedValue(['w1']);
    jest
      .spyOn(feedbackService, 'listRecentPassedEventIds')
      .mockResolvedValue(['passed']);
    findPositionSpy = jest
      .spyOn(locationService, 'findPosition')
      .mockResolvedValue(PARIS);
    byIdsSpy = jest
      .spyOn(events, 'byIds')
      .mockResolvedValue([buildRankingEvent('p1')]);
    upcomingSpy = jest.spyOn(events, 'upcoming').mockResolvedValue([]);
    jest.spyOn(social, 'allowedEventIds').mockResolvedValue([]);
    jest.spyOn(social, 'friendTouchedEventIds').mockResolvedValue([]);
    // Par defaut un blocage existe : les cas historiques passent par le filtre du graphe.
    hasBlocksSpy = jest.spyOn(socialFeed, 'hasBlocks').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('keeps only the events the graph allows and drops the excluded, the full and the started ones', async () => {
    const keep = buildRankingEvent('keep');
    upcomingSpy.mockResolvedValue([
      keep,
      buildRankingEvent('passed'),
      buildRankingEvent('blocked'),
      buildRankingEvent('full', {
        currentParticipants: 20,
        maxParticipants: 20,
      }),
      buildRankingEvent('started', { startAt: new Date(NOW.getTime() - 1000) }),
    ]);
    jest
      .spyOn(social, 'allowedEventIds')
      .mockResolvedValue(['keep', 'passed', 'full', 'started']);
    jest.spyOn(social, 'friendTouchedEventIds').mockResolvedValue(['keep']);

    const result = await service.collect(USER_ID, NOW);

    expect(result.candidates.map((event) => event.id)).toEqual(['keep']);
    expect([...result.friendTouched]).toEqual(['keep']);
  });

  it('does not scan the graph when the user has no block and the exclusion lists are complete', async () => {
    hasBlocksSpy.mockResolvedValue(false);
    const allowedSpy = jest.spyOn(social, 'allowedEventIds');
    upcomingSpy.mockResolvedValue([
      buildRankingEvent('keep'),
      buildRankingEvent('passed'),
    ]);

    const result = await service.collect(USER_ID, NOW);

    expect(allowedSpy).not.toHaveBeenCalled();
    expect(result.candidates.map((event) => event.id)).toEqual(['keep']);
  });

  it('still scans the graph when the user has a block', async () => {
    hasBlocksSpy.mockResolvedValue(true);
    const allowedSpy = jest
      .spyOn(social, 'allowedEventIds')
      .mockResolvedValue(['keep']);
    upcomingSpy.mockResolvedValue([
      buildRankingEvent('keep'),
      buildRankingEvent('blocked'),
    ]);

    const result = await service.collect(USER_ID, NOW);

    expect(allowedSpy).toHaveBeenCalledWith(USER_ID);
    expect(result.candidates.map((event) => event.id)).toEqual(['keep']);
  });

  it('still scans the graph when an exclusion list reached its limit, since it may be truncated', async () => {
    hasBlocksSpy.mockResolvedValue(false);
    const allowedSpy = jest
      .spyOn(social, 'allowedEventIds')
      .mockResolvedValue(['keep']);
    const cappedService = new EventCandidateService(
      social,
      socialFeed,
      events,
      feedbackService,
      locationService,
      buildConfig({ historySize: 1, excludeLimit: 2 }),
    );
    upcomingSpy.mockResolvedValue([
      buildRankingEvent('keep'),
      buildRankingEvent('beyond-the-limit'),
    ]);

    const result = await cappedService.collect(USER_ID, NOW);

    expect(allowedSpy).toHaveBeenCalledWith(USER_ID);
    expect(result.candidates.map((event) => event.id)).toEqual(['keep']);
  });

  it('falls back to the graph scan when the block check fails, rather than skipping the filter', async () => {
    hasBlocksSpy.mockRejectedValue(new Error('ms-social unavailable'));
    const allowedSpy = jest
      .spyOn(social, 'allowedEventIds')
      .mockResolvedValue(['keep']);
    upcomingSpy.mockResolvedValue([
      buildRankingEvent('keep'),
      buildRankingEvent('blocked'),
    ]);

    const result = await service.collect(USER_ID, NOW);

    expect(allowedSpy).toHaveBeenCalledWith(USER_ID);
    expect(result.candidates.map((event) => event.id)).toEqual(['keep']);
  });

  it('reads the history from the first events of each list only and asks ms-event by ids', async () => {
    await service.collect(USER_ID, NOW);

    expect(byIdsSpy).toHaveBeenCalledWith(['p1', 'w1']);
  });

  it('searches around the stored position', async () => {
    await service.collect(USER_ID, NOW);

    expect(upcomingSpy).toHaveBeenCalledWith(
      NOW,
      150,
      PARIS,
      expect.anything(),
      expect.anything(),
    );
  });

  it('asks ms-event to leave out the participated, wished and passed events, and the user own events', async () => {
    await service.collect(USER_ID, NOW);

    expect(upcomingSpy).toHaveBeenCalledWith(
      NOW,
      150,
      PARIS,
      ['p1', 'p2', 'w1', 'passed'],
      [USER_ID],
    );
  });

  it('sends each excluded id once', async () => {
    jest.spyOn(social, 'wishedEventIds').mockResolvedValue(['p1', 'w1']);

    await service.collect(USER_ID, NOW);

    expect(upcomingSpy).toHaveBeenCalledWith(
      NOW,
      150,
      PARIS,
      ['p1', 'p2', 'w1', 'passed'],
      [USER_ID],
    );
  });

  it('falls back to the centre of the history when no position is stored', async () => {
    findPositionSpy.mockResolvedValue(null);
    byIdsSpy.mockResolvedValue([
      buildRankingEvent('p1', { location: { lat: 45, lng: 5 } }),
    ]);

    const result = await service.collect(USER_ID, NOW);

    expect(result.origin).not.toBeNull();
    expect(result.origin?.lat).toBeCloseTo(45);
  });

  it('has no origin without position and without history', async () => {
    findPositionSpy.mockResolvedValue(null);
    byIdsSpy.mockResolvedValue([]);

    const result = await service.collect(USER_ID, NOW);

    expect(result.origin).toBeNull();
    expect(upcomingSpy).toHaveBeenCalledWith(
      NOW,
      150,
      null,
      expect.anything(),
      expect.anything(),
    );
  });
});
