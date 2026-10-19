/** Forme commune des reponses paginees d'identifiants de ms-social. */
export interface PaginatedIdsResponse {
  ids: string[];
  pagination?: { totalPages: number };
}
