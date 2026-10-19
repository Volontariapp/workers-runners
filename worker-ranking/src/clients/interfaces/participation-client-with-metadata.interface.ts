import type { Metadata } from '@grpc/grpc-js';
import type { Observable } from 'rxjs';
import type {
  AdminGetRecommendedEventIdsQuery,
  AdminGetRecommendedEventIdsResponse,
  AdminGetUserEventQuery,
  AdminGetUserEventResponse,
  AdminGetUserParticipateEventQuery,
  AdminGetUserParticipateEventResponse,
  AdminGetUserWishEventQuery,
  AdminGetUserWishEventResponse,
  GetEventParticipantsQuery,
  GetEventParticipantsResponse,
  ParticipationQueryServiceClient,
} from '@volontariapp/contracts-nest';

/** Le client genere ne type pas les metadonnees gRPC, necessaires au jeton interne. */
export interface ParticipationClientWithMetadata extends ParticipationQueryServiceClient {
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
