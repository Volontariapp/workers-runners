import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import type { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, type Observable } from 'rxjs';
import {
  EVENT_QUERY_SERVICE_NAME,
  EventState,
  type EventQueryServiceClient,
  type SearchEventsQuery,
  type SearchEventsResponse,
} from '@volontariapp/contracts-nest';
import { MAX_DISTANCE_KM, type GeoPoint } from '@volontariapp/domain-ranking';
import { EVENT_PACKAGE } from '../infrastructure/grpc/constants.js';
import { InternalMetadataProvider } from './internal-metadata.provider.js';
import { toRankingEvent, type RankingEvent } from './ranking-event.js';

/** Plafond d'une page de ms-event. */
const MAX_PAGE_LIMIT = 100;

interface EventQueryClientWithMetadata extends EventQueryServiceClient {
  searchEvents(
    request: SearchEventsQuery,
    metadata?: Metadata,
  ): Observable<SearchEventsResponse>;
}

const emptyQuery = (): SearchEventsQuery => ({
  area: undefined,
  types: [],
  tagSlugs: [],
  onlyAvailable: false,
  searchTerm: '',
  organizerId: '',
  ids: [],
  excludedIds: [],
  statuses: [],
  pagination: undefined,
});

/** Lectures de ms-event, source de verite des candidats (aucune pagination implicite). */
@Injectable()
export class EventRankingClient implements OnModuleInit {
  private events!: EventQueryClientWithMetadata;

  constructor(
    @Inject(EVENT_PACKAGE) private readonly client: ClientGrpc,
    private readonly internalMetadata: InternalMetadataProvider,
  ) {}

  onModuleInit(): void {
    this.events = this.client.getService<EventQueryServiceClient>(
      EVENT_QUERY_SERVICE_NAME,
    ) as EventQueryClientWithMetadata;
  }

  /**
   * Evenements publies et non commences, dans le rayon maximal autour de l'origine quand elle est
   * connue (le rayon se donne en metres). Sans origine, tous les evenements a venir.
   */
  async upcoming(
    now: Date,
    limit: number,
    origin: GeoPoint | null,
  ): Promise<RankingEvent[]> {
    return this.search({
      ...emptyQuery(),
      statuses: [EventState.EVENT_STATE_PUBLISHED],
      startDateFrom: now.toISOString(),
      area: origin
        ? {
            center: { latitude: origin.lat, longitude: origin.lng },
            radiusMeters: MAX_DISTANCE_KM * 1000,
          }
        : undefined,
      pagination: { page: 1, limit: Math.min(limit, MAX_PAGE_LIMIT) },
    });
  }

  /** Evenements par identifiants (historique), a la place de GetEventsByIds (N+1, erreurs avalees). */
  async byIds(ids: readonly string[]): Promise<RankingEvent[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.search({
      ...emptyQuery(),
      ids: [...ids],
      pagination: { page: 1, limit: Math.min(ids.length, MAX_PAGE_LIMIT) },
    });
  }

  private async search(query: SearchEventsQuery): Promise<RankingEvent[]> {
    const response = await firstValueFrom(
      this.events.searchEvents(query, await this.internalMetadata.get()),
    );
    return response.events.flatMap((event) => {
      const mapped = toRankingEvent(event);
      return mapped ? [mapped] : [];
    });
  }
}
