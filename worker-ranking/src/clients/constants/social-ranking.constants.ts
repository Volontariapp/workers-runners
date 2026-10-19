import type { GraphFilters } from '../types/graph-filters.type.js';

export const PAGE_SIZE = 50;
export const GRAPH_PAGE_SIZE = 1000;

export const NO_GRAPH_FILTER: GraphFilters = {
  excludeCreatedByMe: false,
  excludeBlockedUsers: false,
  excludeParticipatedByMe: false,
  excludeWishedByMe: false,
  onlyParticipatedByFriends: false,
  onlyWishedByFriends: false,
  onlyCreatedByFriends: false,
};
