import { describe, expect, it } from '@jest/globals';
import { RankingListKind } from '@volontariapp/domain-ranking';
import { orderForLocking } from '../../domain/helpers/lock-order.helpers.js';

const A = '11111111-1111-4111-a111-111111111111';
const B = '22222222-2222-4222-a222-222222222222';

describe('orderForLocking (Unit)', () => {
  it('returns the same order whatever the input order', () => {
    const first = orderForLocking([
      { userId: B, listKind: RankingListKind.EVENT, reason: 'EVENT_CREATED' },
      { userId: A, listKind: RankingListKind.EVENT, reason: 'EVENT_CREATED' },
    ]);
    const second = orderForLocking([
      { userId: A, listKind: RankingListKind.EVENT, reason: 'EVENT_CREATED' },
      { userId: B, listKind: RankingListKind.EVENT, reason: 'EVENT_CREATED' },
    ]);

    expect(first.map((r) => r.userId)).toEqual([A, B]);
    expect(second).toEqual(first);
  });

  it('removes duplicates and keeps the first reason', () => {
    const result = orderForLocking([
      { userId: A, listKind: RankingListKind.EVENT, reason: 'EVENT_CREATED' },
      { userId: A, listKind: RankingListKind.EVENT, reason: 'EVENT_FINISHED' },
    ]);

    expect(result).toEqual([
      { userId: A, listKind: RankingListKind.EVENT, reason: 'EVENT_CREATED' },
    ]);
  });

  it('keeps one request per list kind of the same user', () => {
    const result = orderForLocking([
      { userId: A, listKind: RankingListKind.POST, reason: 'POST_PUBLISHED' },
      { userId: A, listKind: RankingListKind.EVENT, reason: 'EVENT_CREATED' },
    ]);

    expect(result).toHaveLength(2);
  });
});
