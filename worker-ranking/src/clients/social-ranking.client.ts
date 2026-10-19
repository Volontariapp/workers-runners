import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import type { Metadata } from '@grpc/grpc-js';
import { firstValueFrom, type Observable } from 'rxjs';
import {
  PARTICIPATION_QUERY_SERVICE_NAME,
  type AdminGetRecommendedEventIdsQuery,
  type AdminGetRecommendedEventIdsResponse,
  type AdminGetUserEventQuery,
  type AdminGetUserEventResponse,
  type AdminGetUserParticipateEventQuery,
  type AdminGetUserParticipateEventResponse,
  type AdminGetUserWishEventQuery,
  type AdminGetUserWishEventResponse,
  type GetEventParticipantsQuery,
  type GetEventParticipantsResponse,
  type ParticipationQueryServiceClient,
} from '@volontariapp/contracts-nest';
import { SOCIAL_PACKAGE } from '../infrastructure/grpc/constants.js';
import { InternalMetadataProvider } from './internal-metadata.provider.js';
import { collectIds, type IdsPage } from './paginated-ids.js';

const PAGE_SIZE = 50;
const GRAPH_PAGE_SIZE = 1000;

interface ParticipationClientWithMetadata extends ParticipationQueryServiceClient {
  adminGetUserEvent(
    request: AdminGetUserEventQuery,
    metadata?: Metadata,
  ): Observable<AdminGetUserEventResponse>;
  adminGetUserParticipateEvent(
    request: AdminGetUserParticipateEventQuery,
    metadata?: Metadata,
  ): Observable<AdminGetUserParticipateEventResponse>;
  adminGetUserWishEvent(
    request: AdminGetUserWishEventQuery,
    metadata?: Metadata,
  ): Observable<AdminGetUserWishEventResponse>;
  adminGetRecommendedEventIds(
    request: AdminGetRecommendedEventIdsQuery,
    metadata?: Metadata,
  ): Observable<AdminGetRecommendedEventIdsResponse>;
  getEventParticipants(
    request: GetEventParticipantsQuery,
    metadata?: Metadata,
  ): Observable<GetEventParticipantsResponse>;
}

type GraphFilters = Omit<
  AdminGetRecommendedEventIdsQuery,
  'userId' | 'pagination'
>;

const NO_FILTER: GraphFilters = {
  excludeCreatedByMe: false,
  excludeBlockedUsers: false,
  excludeParticipatedByMe: false,
  excludeWishedByMe: false,
  onlyParticipatedByFriends: false,
  onlyWishedByFriends: false,
  onlyCreatedByFriends: false,
};

const toPage = (response: {
  ids: string[];
  pagination?: { totalPages: number };
}): IdsPage => ({
  ids: response.ids,
  totalPages: response.pagination?.totalPages ?? 1,
});

/** Lectures du graphe social (ms-social) avec le jeton interne du worker. */
@Injectable()
export class SocialRankingClient implements OnModuleInit {
  private participation!: ParticipationClientWithMetadata;

  constructor(
    @Inject(SOCIAL_PACKAGE) private readonly client: ClientGrpc,
    private readonly internalMetadata: InternalMetadataProvider,
  ) {}

  onModuleInit(): void {
    this.participation =
      this.client.getService<ParticipationQueryServiceClient>(
        PARTICIPATION_QUERY_SERVICE_NAME,
      ) as ParticipationClientWithMetadata;
  }

  /** Evenements participes, du plus recent au plus ancien, au plus `max`. */
  participatedEventIds(userId: string, max: number): Promise<string[]> {
    return this.paged(max, async (page, limit, metadata) =>
      toPage(
        await firstValueFrom(
          this.participation.adminGetUserParticipateEvent(
            { userId, pagination: { page, limit } },
            metadata,
          ),
        ),
      ),
    );
  }

  wishedEventIds(userId: string, max: number): Promise<string[]> {
    return this.paged(max, async (page, limit, metadata) =>
      toPage(
        await firstValueFrom(
          this.participation.adminGetUserWishEvent(
            { userId, pagination: { page, limit } },
            metadata,
          ),
        ),
      ),
    );
  }

  createdEventIds(userId: string, max: number): Promise<string[]> {
    return this.paged(max, async (page, limit, metadata) =>
      toPage(
        await firstValueFrom(
          this.participation.adminGetUserEvent(
            { userId, pagination: { page, limit } },
            metadata,
          ),
        ),
      ),
    );
  }

  /** Evenements autorises par le graphe : ni crees, ni participes, ni souhaites, ni d'un bloque. */
  allowedEventIds(userId: string): Promise<string[]> {
    return this.recommended(userId, {
      ...NO_FILTER,
      excludeCreatedByMe: true,
      excludeBlockedUsers: true,
      excludeParticipatedByMe: true,
      excludeWishedByMe: true,
    });
  }

  /** Evenements touches par au moins un ami (signal booleen, pas un compte). */
  friendTouchedEventIds(userId: string): Promise<string[]> {
    return this.recommended(userId, {
      ...NO_FILTER,
      onlyParticipatedByFriends: true,
      onlyWishedByFriends: true,
      onlyCreatedByFriends: true,
    });
  }

  /** Participants d'un evenement, sans plafond : leur historique a change. */
  eventParticipantIds(eventId: string): Promise<string[]> {
    return collectIds(
      async (page, limit) =>
        toPage(
          await firstValueFrom(
            this.participation.getEventParticipants(
              { eventId, pagination: { page, limit } },
              await this.internalMetadata.get(),
            ),
          ),
        ),
      { pageSize: PAGE_SIZE },
    );
  }

  private recommended(
    userId: string,
    filters: GraphFilters,
  ): Promise<string[]> {
    return collectIds(
      async (page, limit) =>
        toPage(
          await firstValueFrom(
            this.participation.adminGetRecommendedEventIds(
              { userId, ...filters, pagination: { page, limit } },
              await this.internalMetadata.get(),
            ),
          ),
        ),
      { pageSize: GRAPH_PAGE_SIZE },
    );
  }

  private paged(
    max: number,
    fetch: (
      page: number,
      limit: number,
      metadata: Metadata,
    ) => Promise<IdsPage>,
  ): Promise<string[]> {
    if (max <= 0) {
      return Promise.resolve([]);
    }
    return collectIds(
      async (page, limit) =>
        fetch(page, limit, await this.internalMetadata.get()),
      { pageSize: Math.min(PAGE_SIZE, max), max },
    );
  }
}
