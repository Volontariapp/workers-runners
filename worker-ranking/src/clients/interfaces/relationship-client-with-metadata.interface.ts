import type { Metadata } from '@grpc/grpc-js';
import type { Observable } from 'rxjs';
import type {
  AdminGetIsFollowingQuery,
  AdminGetIsFollowingResponse,
  AdminGetMyBlocksQuery,
  AdminGetMyBlocksResponse,
  AdminGetMyFollowersQuery,
  AdminGetMyFollowersResponse,
  AdminGetMyFollowsQuery,
  AdminGetMyFollowsResponse,
  AdminGetWhoBlockedMeQuery,
  AdminGetWhoBlockedMeResponse,
  RelationshipQueryServiceClient,
} from '@volontariapp/contracts-nest';

/** Le client genere ne type pas les metadonnees gRPC, necessaires au jeton interne. */
export interface RelationshipClientWithMetadata extends RelationshipQueryServiceClient {
  adminGetMyFollows(
    request: AdminGetMyFollowsQuery,
    metadata?: Metadata,
  ): Observable<AdminGetMyFollowsResponse>;
  adminGetMyFollowers(
    request: AdminGetMyFollowersQuery,
    metadata?: Metadata,
  ): Observable<AdminGetMyFollowersResponse>;
  adminGetMyBlocks(
    request: AdminGetMyBlocksQuery,
    metadata?: Metadata,
  ): Observable<AdminGetMyBlocksResponse>;
  adminGetWhoBlockedMe(
    request: AdminGetWhoBlockedMeQuery,
    metadata?: Metadata,
  ): Observable<AdminGetWhoBlockedMeResponse>;
  adminGetIsFollowing(
    request: AdminGetIsFollowingQuery,
    metadata?: Metadata,
  ): Observable<AdminGetIsFollowingResponse>;
}
