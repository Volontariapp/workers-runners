import type { Metadata } from '@grpc/grpc-js';
import type { Observable } from 'rxjs';
import type {
  AdminGetUserLikesQuery,
  AdminGetUserLikesResponse,
  InteractionQueryServiceClient,
} from '@volontariapp/contracts-nest';

/** Le client genere ne type pas les metadonnees gRPC, necessaires au jeton interne. */
export interface InteractionClientWithMetadata extends InteractionQueryServiceClient {
  adminGetUserLikes(
    request: AdminGetUserLikesQuery,
    metadata?: Metadata,
  ): Observable<AdminGetUserLikesResponse>;
}
