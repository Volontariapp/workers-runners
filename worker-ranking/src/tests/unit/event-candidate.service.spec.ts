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
import {
  createMockEventClient,
  createMockFeedbackService,
  createMockLocationService,
  createMockSocialClient,
} from '../mocks/ranking.mock.js';

describe('EventCandidateService (Unit)', () => {
  const social = createMockSocialClient();
  const events = createMockEventClient();
  const feedbackService = createMockFeedbackService();
  const locationService = createMockLocationService();
  let service: EventCandidateService;
  let upcomingSpy: jest.SpiedFunction<typeof events.upcoming>;
  let byIdsSpy: jest.SpiedFunction<typeof events.byIds>;
  let findPositionSpy: jest.SpiedFunction<typeof locationService.findPosition>;

  beforeEach(() => {
    service = new EventCandidateService(
      social,
      events,
      feedbackService,
      locationService,
      buildConfig({ historySize: 1 }),
    );
    jest.spyOn(social, 'participatedEventIds').mockResolvedValue(['p1', 'p2']);
    jest.spyOn(social, 'wishedEventIds').mockResolvedValue(['w1']);
    jest.spyOn(social, 'createdEventIds').mockResolvedValue(['c1']);
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
      buildRankingEvent('c1'),
      buildRankingEvent('blocked'),
      buildRankingEvent('full', {
        currentParticipants: 20,
        maxParticipants: 20,
      }),
      buildRankingEvent('started', { startAt: new Date(NOW.getTime() - 1000) }),
    ]);
    jest
      .spyOn(social, 'allowedEventIds')
      .mockResolvedValue(['keep', 'passed', 'c1', 'full', 'started']);
    jest.spyOn(social, 'friendTouchedEventIds').mockResolvedValue(['keep']);

    const result = await service.collect(USER_ID, NOW);

    expect(result.candidates.map((event) => event.id)).toEqual(['keep']);
    expect([...result.friendTouched]).toEqual(['keep']);
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
    );
  });

  it('asks ms-event to leave out the participated, wished, created and passed events', async () => {
    await service.collect(USER_ID, NOW);

    expect(upcomingSpy).toHaveBeenCalledWith(NOW, 150, PARIS, [
      'p1',
      'p2',
      'w1',
      'c1',
      'passed',
    ]);
  });

  it('sends each excluded id once', async () => {
    jest.spyOn(social, 'wishedEventIds').mockResolvedValue(['p1', 'w1']);

    await service.collect(USER_ID, NOW);

    expect(upcomingSpy).toHaveBeenCalledWith(NOW, 150, PARIS, [
      'p1',
      'p2',
      'w1',
      'c1',
      'passed',
    ]);
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
    expect(upcomingSpy).toHaveBeenCalledWith(NOW, 150, null, expect.anything());
  });
});
