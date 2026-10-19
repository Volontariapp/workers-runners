import { describe, expect, it } from '@jest/globals';
import { authorPriority } from '../../scoring/helpers/author-priority.helpers.js';
import { AUTHOR_A, AUTHOR_B, AUTHOR_C } from '../factories/feed.factory.js';

describe('authorPriority (Unit)', () => {
  it('orders the engaged authors by weight, then the follows, without duplicates or exclusions, capped', () => {
    const signals = new Map([
      [AUTHOR_A, [{ kind: 'LIKE' as const, ageDays: 1 }]],
      [AUTHOR_B, [{ kind: 'COMMENT' as const, ageDays: 1 }]],
    ]);

    expect(
      authorPriority(
        signals,
        [AUTHOR_A, AUTHOR_C, 'blocked'],
        new Set(['blocked']),
        10,
      ),
    ).toEqual([AUTHOR_B, AUTHOR_A, AUTHOR_C]);
    expect(authorPriority(signals, [AUTHOR_C], new Set(), 2)).toEqual([
      AUTHOR_B,
      AUTHOR_A,
    ]);
  });
});
