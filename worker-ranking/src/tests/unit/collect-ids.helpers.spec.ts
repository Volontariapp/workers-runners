import { describe, expect, it, jest } from '@jest/globals';
import { collectIds } from '../../clients/helpers/collect-ids.helpers.js';
import type { IdsPage } from '../../clients/interfaces/ids-page.interface.js';

describe('collectIds helper (Unit)', () => {
  const pages: Record<number, IdsPage> = {
    1: { ids: ['a', 'b'], totalPages: 3 },
    2: { ids: ['b', 'c'], totalPages: 3 },
    3: { ids: ['d'], totalPages: 3 },
  };
  const fetchPage = jest.fn((page: number) =>
    Promise.resolve(pages[page] ?? { ids: [], totalPages: 1 }),
  );

  it('reads every page and removes the duplicates', async () => {
    fetchPage.mockClear();

    expect(await collectIds(fetchPage, { pageSize: 2 })).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('stops once the cap is reached and truncates to it', async () => {
    fetchPage.mockClear();

    expect(await collectIds(fetchPage, { pageSize: 2, max: 3 })).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('reads a single page when the service reports no page count', async () => {
    const single = jest.fn(() =>
      Promise.resolve({ ids: ['x'], totalPages: 1 }),
    );

    expect(await collectIds(single, { pageSize: 50 })).toEqual(['x']);
    expect(single).toHaveBeenCalledTimes(1);
  });
});
