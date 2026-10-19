import type { AdminGetRecommendedEventIdsQuery } from '@volontariapp/contracts-nest';

/** Filtres du graphe de AdminGetRecommendedEventIds, sans l'utilisateur ni la pagination. */
export type GraphFilters = Omit<
  AdminGetRecommendedEventIdsQuery,
  'userId' | 'pagination'
>;
