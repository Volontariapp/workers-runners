import type { CollectOptions } from '../interfaces/collect-options.interface.js';
import type { IdsPage } from '../interfaces/ids-page.interface.js';

/** Lit les pages d'une RPC paginee jusqu'a epuisement ou plafond, sans doublon. */
export const collectIds = async (
  fetchPage: (page: number, limit: number) => Promise<IdsPage>,
  options: CollectOptions,
): Promise<string[]> => {
  const collected = new Set<string>();
  let page = 1;
  let totalPages = 1;
  do {
    const result = await fetchPage(page, options.pageSize);
    result.ids.forEach((id) => collected.add(id));
    totalPages = result.totalPages;
    page += 1;
  } while (
    page <= totalPages &&
    (options.max === undefined || collected.size < options.max)
  );
  const ids = [...collected];
  return options.max === undefined ? ids : ids.slice(0, options.max);
};
