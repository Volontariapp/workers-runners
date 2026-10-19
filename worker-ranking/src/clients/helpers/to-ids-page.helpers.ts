import type { IdsPage } from '../interfaces/ids-page.interface.js';
import type { PaginatedIdsResponse } from '../interfaces/paginated-response.interface.js';

export const toIdsPage = (response: PaginatedIdsResponse): IdsPage => ({
  ids: response.ids,
  totalPages: response.pagination?.totalPages ?? 1,
});
