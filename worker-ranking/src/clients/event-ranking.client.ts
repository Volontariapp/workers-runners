import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  EVENT_QUERY_SERVICE_NAME,
  EventState,
  type EventQueryServiceClient,
  type SearchEventsQuery,
} from '@volontariapp/contracts-nest';
import { MAX_DISTANCE_KM, type GeoPoint } from '@volontariapp/domain-ranking';
import { EVENT_PACKAGE } from '../infrastructure/grpc/constants.js';
import { InternalMetadataProvider } from './internal-metadata.provider.js';
import { MAX_PAGE_LIMIT } from './constants/event-ranking.constants.js';
import { emptySearchQuery } from './helpers/empty-search-query.helpers.js';
import { toRankingEvent } from './helpers/to-ranking-event.helpers.js';
import type { EventQueryClientWithMetadata } from './interfaces/event-query-client-with-metadata.interface.js';
import type { RankingEvent } from './interfaces/ranking-event.interface.js';

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
   * Les identifiants exclus sont retires par ms-event avant la coupe a `limit` : la page ne se
   * remplit pas d'evenements deja vus.
   */
  async upcoming(
    now: Date,
    limit: number,
    origin: GeoPoint | null,
    excludedIds: readonly string[],
  ): Promise<RankingEvent[]> {
    return this.search({
      ...emptySearchQuery(),
      statuses: [EventState.EVENT_STATE_PUBLISHED],
      startDateFrom: now.toISOString(),
      excludedIds: [...excludedIds],
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
      ...emptySearchQuery(),
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
