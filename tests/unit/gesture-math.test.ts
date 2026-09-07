import { describe, it, expect } from 'vitest';
import { evaluateSwipeThreshold } from '../../src/gestures/thresholds';

describe('evaluateSwipeThreshold', () => {
  const viewportHeight = 844; // Standard iPhone 14 height

  it('commits swipe up when velocity >= 300 px/s even with small displacement', () => {
    // Swipe upward: negative deltaY
    const result = evaluateSwipeThreshold({
      deltaY: -50,
      elapsedMs: 100, // 500 px/s upward
      viewportHeight
    });
    expect(result.committed).toBe(true);
    expect(result.direction).toBe('up');
  });

  it('commits swipe up when displacement >= 30% viewport height even with slow velocity', () => {
    // 30% of 844 = 253.2 px
    const result = evaluateSwipeThreshold({
      deltaY: -260,
      elapsedMs: 1500, // Slow drag
      viewportHeight
    });
    expect(result.committed).toBe(true);
    expect(result.direction).toBe('up');
  });

  it('commits swipe down when velocity >= 300 px/s downward', () => {
    const result = evaluateSwipeThreshold({
      deltaY: 80,
      elapsedMs: 150, // > 500 px/s downward
      viewportHeight
    });
    expect(result.committed).toBe(true);
    expect(result.direction).toBe('down');
  });

  it('does NOT commit when both velocity and displacement are below thresholds', () => {
    const result = evaluateSwipeThreshold({
      deltaY: -60,
      elapsedMs: 800, // ~75 px/s, < 10% height
      viewportHeight
    });
    expect(result.committed).toBe(false);
    expect(result.direction).toBeNull();
  });
});
