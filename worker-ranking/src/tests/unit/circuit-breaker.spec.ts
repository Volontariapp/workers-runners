import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { CircuitBreaker } from '../../scoring/adapters/circuit-breaker.js';

describe('CircuitBreaker (Unit)', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker({ threshold: 3, cooldownMs: 1000 });
  });

  it('starts CLOSED and allows execution', () => {
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.canExecute()).toBe(true);
  });

  it('trips to OPEN after reaching failure threshold', () => {
    cb.recordFailure();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.canExecute()).toBe(true);

    cb.recordFailure();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.canExecute()).toBe(true);

    cb.recordFailure();
    expect(cb.getState()).toBe('OPEN');
    expect(cb.canExecute()).toBe(false);
  });

  it('resets consecutive failures on success', () => {
    cb.recordFailure();
    cb.recordFailure();
    cb.recordSuccess();

    expect(cb.getState()).toBe('CLOSED');

    cb.recordFailure();
    expect(cb.getState()).toBe('CLOSED');
  });

  it('transitions to HALF_OPEN after cooldown period', () => {
    jest.useFakeTimers();
    try {
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
      expect(cb.canExecute()).toBe(false);

      jest.advanceTimersByTime(500);
      expect(cb.getState()).toBe('OPEN');
      expect(cb.canExecute()).toBe(false);

      jest.advanceTimersByTime(501);
      expect(cb.getState()).toBe('HALF_OPEN');
      expect(cb.canExecute()).toBe(true);

      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.canExecute()).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('re-trips to OPEN if failure occurs while HALF_OPEN', () => {
    jest.useFakeTimers();
    try {
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');

      jest.advanceTimersByTime(1001);
      expect(cb.getState()).toBe('HALF_OPEN');

      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
      expect(cb.canExecute()).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});
