import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  EVENT_POST_LINK_QUERY_SERVICE_NAME,
  INTERACTION_QUERY_SERVICE_NAME,
  RELATIONSHIP_QUERY_SERVICE_NAME,
  type EventPostLinkQueryServiceClient,
  type InteractionQueryServiceClient,
  type RelationshipQueryServiceClient,
} from '@volontariapp/contracts-nest';
import { SOCIAL_PACKAGE } from '../infrastructure/grpc/constants.js';
import { InternalMetadataProvider } from './internal-metadata.provider.js';
import { PAGE_SIZE } from './constants/social-ranking.constants.js';
import {
  EVENT_POSTS_PER_EVENT,
  IS_FOLLOWING_CONCURRENCY,
} from './constants/social-feed.constants.js';
import { chunk } from './helpers/chunk.helpers.js';
import { collectIds } from './helpers/collect-ids.helpers.js';
import { toIdsPage } from './helpers/to-ids-page.helpers.js';
import type { EventPostLinkClientWithMetadata } from './interfaces/event-post-link-client-with-metadata.interface.js';
import type { InteractionClientWithMetadata } from './interfaces/interaction-client-with-metadata.interface.js';
import type { LikedPosts } from './interfaces/liked-posts.interface.js';
import type { RelationshipClientWithMetadata } from './interfaces/relationship-client-with-metadata.interface.js';

/** Lectures du graphe social pour le feed : relations, blocages, likes et posts lies aux evenements. */
@Injectable()
export class SocialFeedClient implements OnModuleInit {
  private relationship!: RelationshipClientWithMetadata;
  private interaction!: InteractionClientWithMetadata;
  private eventPostLink!: EventPostLinkClientWithMetadata;

  constructor(
    @Inject(SOCIAL_PACKAGE) private readonly client: ClientGrpc,
    private readonly internalMetadata: InternalMetadataProvider,
  ) {}

  onModuleInit(): void {
    this.relationship = this.client.getService<RelationshipQueryServiceClient>(
      RELATIONSHIP_QUERY_SERVICE_NAME,
    ) as RelationshipClientWithMetadata;
    this.interaction = this.client.getService<InteractionQueryServiceClient>(
      INTERACTION_QUERY_SERVICE_NAME,
    ) as InteractionClientWithMetadata;
    this.eventPostLink =
      this.client.getService<EventPostLinkQueryServiceClient>(
        EVENT_POST_LINK_QUERY_SERVICE_NAME,
      ) as EventPostLinkClientWithMetadata;
  }

  /** Comptes suivis par l'utilisateur, pagines par 50, au plus `max`. */
  followedIds(userId: string, max: number): Promise<string[]> {
    return collectIds(
      async (page, limit) =>
        toIdsPage(
          await firstValueFrom(
            this.relationship.adminGetMyFollows(
              { userId, pagination: { page, limit } },
              await this.internalMetadata.get(),
            ),
          ),
        ),
      { pageSize: PAGE_SIZE, max },
    );
  }

  /** Abonnes de l'utilisateur, pagines par 50, au plus `max` (fan-out de POST_CREATED). */
  followerIds(userId: string, max: number): Promise<string[]> {
    return collectIds(
      async (page, limit) =>
        toIdsPage(
          await firstValueFrom(
            this.relationship.adminGetMyFollowers(
              { userId, pagination: { page, limit } },
              await this.internalMetadata.get(),
            ),
          ),
        ),
      { pageSize: PAGE_SIZE, max },
    );
  }

  /** Comptes bloques par l'utilisateur et comptes qui l'ont bloque (exclusion dans les deux sens). */
  async blockedIds(userId: string, max: number): Promise<Set<string>> {
    const [blocked, blockedMe] = await Promise.all([
      collectIds(
        async (page, limit) =>
          toIdsPage(
            await firstValueFrom(
              this.relationship.adminGetMyBlocks(
                { userId, pagination: { page, limit } },
                await this.internalMetadata.get(),
              ),
            ),
          ),
        { pageSize: PAGE_SIZE, max },
      ),
      collectIds(
        async (page, limit) =>
          toIdsPage(
            await firstValueFrom(
              this.relationship.adminGetWhoBlockedMe(
                { userId, pagination: { page, limit } },
                await this.internalMetadata.get(),
              ),
            ),
          ),
        { pageSize: PAGE_SIZE, max },
      ),
    ]);
    return new Set([...blocked, ...blockedMe]);
  }

  /** Parmi les auteurs suivis, ceux qui suivent aussi l'utilisateur (amis : suivi dans les deux sens). */
  async friendIds(
    userId: string,
    followedAuthorIds: readonly string[],
  ): Promise<Set<string>> {
    const friends = new Set<string>();
    for (const batch of chunk(followedAuthorIds, IS_FOLLOWING_CONCURRENCY)) {
      const answers = await Promise.all(
        batch.map(async (authorId) => {
          const response = await firstValueFrom(
            this.relationship.adminGetIsFollowing(
              { followerId: authorId, followedId: userId },
              await this.internalMetadata.get(),
            ),
          );
          return { authorId, isFollowing: response.isFollowing };
        }),
      );
      answers
        .filter(({ isFollowing }) => isFollowing)
        .forEach(({ authorId }) => friends.add(authorId));
    }
    return friends;
  }

  /** Likes du graphe (verite de l'existence d'un like), pagines par 50, au plus `max`. */
  async likedPostIds(userId: string, max: number): Promise<LikedPosts> {
    const read = { exhausted: false };
    const ids = await collectIds(
      async (page, limit) => {
        const result = toIdsPage(
          await firstValueFrom(
            this.interaction.adminGetUserLikes(
              { userId, pagination: { page, limit } },
              await this.internalMetadata.get(),
            ),
          ),
        );
        read.exhausted = page >= result.totalPages;
        return result;
      },
      { pageSize: PAGE_SIZE, max },
    );
    return { ids, complete: read.exhausted && ids.length < max };
  }

  /** Posts lies a un evenement, une page de 50 au plus. */
  async eventPostIds(eventId: string): Promise<string[]> {
    const response = await firstValueFrom(
      this.eventPostLink.getEventPosts(
        { eventId, pagination: { page: 1, limit: EVENT_POSTS_PER_EVENT } },
        await this.internalMetadata.get(),
      ),
    );
    return response.ids;
  }
}
