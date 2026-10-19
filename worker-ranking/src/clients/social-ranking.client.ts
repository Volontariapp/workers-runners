import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import type { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import {
  PARTICIPATION_QUERY_SERVICE_NAME,
  type ParticipationQueryServiceClient,
} from '@volontariapp/contracts-nest';
import { SOCIAL_PACKAGE } from '../infrastructure/grpc/constants.js';
import { InternalMetadataProvider } from './internal-metadata.provider.js';
import {
  GRAPH_PAGE_SIZE,
  NO_GRAPH_FILTER,
  PAGE_SIZE,
} from './constants/social-ranking.constants.js';
import { collectIds } from './helpers/collect-ids.helpers.js';
import { toIdsPage } from './helpers/to-ids-page.helpers.js';
import type { IdsPage } from './interfaces/ids-page.interface.js';
import type { ParticipationClientWithMetadata } from './interfaces/participation-client-with-metadata.interface.js';
import type { GraphFilters } from './types/graph-filters.type.js';

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
      toIdsPage(
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
      toIdsPage(
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
      toIdsPage(
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
      ...NO_GRAPH_FILTER,
      excludeCreatedByMe: true,
      excludeBlockedUsers: true,
      excludeParticipatedByMe: true,
      excludeWishedByMe: true,
    });
  }

  /** Evenements touches par au moins un ami (signal booleen, pas un compte). */
  friendTouchedEventIds(userId: string): Promise<string[]> {
    return this.recommended(userId, {
      ...NO_GRAPH_FILTER,
      onlyParticipatedByFriends: true,
      onlyWishedByFriends: true,
      onlyCreatedByFriends: true,
    });
  }

  /** Participants d'un evenement, sans plafond : leur historique a change. */
  eventParticipantIds(eventId: string): Promise<string[]> {
    return collectIds(
      async (page, limit) =>
        toIdsPage(
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
        toIdsPage(
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
