import 'reflect-metadata';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { of } from 'rxjs';
import {
  EVENT_QUERY_SERVICE_NAME,
  EventState,
} from '@volontariapp/contracts-nest';
import { EventRankingClient } from '../../clients/event-ranking.client.js';
import { NOW, PARIS } from '../factories/ranking.factory.js';
import {
  createMockClientGrpc,
  createMockEventQueryService,
  createMockInternalMetadata,
} from '../mocks/grpc.mock.js';

describe('EventRankingClient (Unit)', () => {
  const eventQuery = createMockEventQueryService();
  let client: EventRankingClient;
  let searchSpy: jest.SpiedFunction<typeof eventQuery.searchEvents>;

  beforeEach(() => {
    client = new EventRankingClient(
      createMockClientGrpc(
        new Map<string, object>([[EVENT_QUERY_SERVICE_NAME, eventQuery]]),
      ),
      createMockInternalMetadata(),
    );
    client.onModuleInit();
    searchSpy = jest
      .spyOn(eventQuery, 'searchEvents')
      .mockReturnValue(of({ events: [], totalCount: 0 }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('searches the published events that have not started, without the excluded ids', async () => {
    await client.upcoming(NOW, 150, PARIS, ['a', 'b']);

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        statuses: [EventState.EVENT_STATE_PUBLISHED],
        startDateFrom: NOW.toISOString(),
        excludedIds: ['a', 'b'],
      }),
      expect.anything(),
    );
  });

  it('caps the page at the ms-event maximum', async () => {
    await client.upcoming(NOW, 150, null, []);

    expect(searchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: { page: 1, limit: 100 },
        area: undefined,
      }),
      expect.anything(),
    );
  });
});
