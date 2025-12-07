import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, CircuitState } from './circuit-breaker.js';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 1000,
      enabled: true,
    });
  });

  it('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should execute function successfully', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should open circuit after threshold failures', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Failure'));

    // Trigger failures
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(fn);
      } catch {
        // Expected
      }
    }

    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should throw error when circuit is OPEN', async () => {
    // Open the circuit
    const fn = vi.fn().mockRejectedValue(new Error('Failure'));
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.execute(fn);
      } catch {
        // Expected
      }
    }

    // Try to execute - should fail fast
    await expect(
      circuitBreaker.execute(() => Promise.resolve('test'))
    ).rejects.toThrow('Circuit breaker is OPEN');
  });

  it('should not break when disabled', async () => {
    const disabledBreaker = new CircuitBreaker({
      failureThreshold: 1,
      resetTimeout: 1000,
      enabled: false,
    });

    const fn = vi.fn().mockRejectedValue(new Error('Failure'));
    await expect(disabledBreaker.execute(fn)).rejects.toThrow('Failure');
    // Should still be closed even after failure
    expect(disabledBreaker.getState()).toBe(CircuitState.CLOSED);
  });
});

