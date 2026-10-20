import type { Metadata } from '@grpc/grpc-js';
import type { Observable } from 'rxjs';
import type {
  EventPostLinkQueryServiceClient,
  GetEventPostsQuery,
  GetEventPostsResponse,
} from '@volontariapp/contracts-nest';

/** Le client genere ne type pas les metadonnees gRPC, necessaires au jeton interne. */
export interface EventPostLinkClientWithMetadata extends EventPostLinkQueryServiceClient {
  getEventPosts(
    request: GetEventPostsQuery,
    metadata?: Metadata,
  ): Observable<GetEventPostsResponse>;
}
