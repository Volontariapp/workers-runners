export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  readonly threshold: number;
  readonly cooldownMs: number;
}

/**
 * Coupe-circuit en memoire pour eviter d'inonder un service externe indisponible.
 * Bascule en OPEN apres `threshold` echecs consecutifs.
 * Apres `cooldownMs`, passe en HALF_OPEN pour tester une requete unique.
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private consecutiveFailures = 0;
  private lastFailureTime = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  getState(): CircuitBreakerState {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.options.cooldownMs) {
        this.state = 'HALF_OPEN';
      }
    }
    return this.state;
  }

  canExecute(): boolean {
    const current = this.getState();
    return current === 'CLOSED' || current === 'HALF_OPEN';
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.state = 'CLOSED';
  }

  recordFailure(): void {
    this.consecutiveFailures += 1;
    this.lastFailureTime = Date.now();
    if (this.consecutiveFailures >= this.options.threshold) {
      this.state = 'OPEN';
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
  }
}
