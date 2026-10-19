import type { Metadata } from '@grpc/grpc-js';
import type { Observable } from 'rxjs';
import type {
  EventQueryServiceClient,
  SearchEventsQuery,
  SearchEventsResponse,
} from '@volontariapp/contracts-nest';

/** Le client genere ne type pas les metadonnees gRPC, necessaires au jeton interne. */
export interface EventQueryClientWithMetadata extends EventQueryServiceClient {
  searchEvents(
    request: SearchEventsQuery,
    metadata?: Metadata,
  ): Observable<SearchEventsResponse>;
}
