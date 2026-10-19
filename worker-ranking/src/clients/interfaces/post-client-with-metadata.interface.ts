import type { Metadata } from '@grpc/grpc-js';
import type { Observable } from 'rxjs';
import type {
  ListCommentsByAuthorQuery,
  ListCommentsByAuthorResponse,
  ListPostsByIdsQuery,
  ListPostsByIdsResponse,
  ListRecentPostsByAuthorsQuery,
  ListRecentPostsByAuthorsResponse,
  PostServiceClient,
} from '@volontariapp/contracts-nest';

/** Le client genere ne type pas les metadonnees gRPC, necessaires au jeton interne. */
export interface PostClientWithMetadata extends PostServiceClient {
  listRecentPostsByAuthors(
    request: ListRecentPostsByAuthorsQuery,
    metadata?: Metadata,
  ): Observable<ListRecentPostsByAuthorsResponse>;
  listPostsByIds(
    request: ListPostsByIdsQuery,
    metadata?: Metadata,
  ): Observable<ListPostsByIdsResponse>;
  listCommentsByAuthor(
    request: ListCommentsByAuthorQuery,
    metadata?: Metadata,
  ): Observable<ListCommentsByAuthorResponse>;
}
