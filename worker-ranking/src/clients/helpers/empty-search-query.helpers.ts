import type { SearchEventsQuery } from '@volontariapp/contracts-nest';

export const emptySearchQuery = (): SearchEventsQuery => ({
  area: undefined,
  types: [],
  tagSlugs: [],
  onlyAvailable: false,
  searchTerm: '',
  organizerId: '',
  ids: [],
  excludedIds: [],
  statuses: [],
  pagination: undefined,
});
