import { describe, it, expect } from 'vitest';
import { calculateNextIndex } from '../../src/gestures/navigation';

describe('Playlist Navigation Boundaries', () => {
  const playlistLength = 5;

  it('advances forward normally when not at the end', () => {
    const { nextIndex, wrapped, bounced } = calculateNextIndex(2, 'up', playlistLength);
    expect(nextIndex).toBe(3);
    expect(wrapped).toBe(false);
    expect(bounced).toBe(false);
  });

  it('wraps to start (index 0) when swiping up on the last video', () => {
    const { nextIndex, wrapped, bounced } = calculateNextIndex(4, 'up', playlistLength);
    expect(nextIndex).toBe(0);
    expect(wrapped).toBe(true);
    expect(bounced).toBe(false);
  });

  it('navigates backward normally when not at the start', () => {
    const { nextIndex, wrapped, bounced } = calculateNextIndex(2, 'down', playlistLength);
    expect(nextIndex).toBe(1);
    expect(wrapped).toBe(false);
    expect(bounced).toBe(false);
  });

  it('bounces back when swiping down on the first video', () => {
    const { nextIndex, wrapped, bounced } = calculateNextIndex(0, 'down', playlistLength);
    expect(nextIndex).toBe(0);
    expect(wrapped).toBe(false);
    expect(bounced).toBe(true);
  });

  it('clamps and bounds direct index selection', () => {
    const clamp = (target: number, total: number) => Math.min(Math.max(target, 0), Math.max(total - 1, 0));
    expect(clamp(-1, playlistLength)).toBe(0);
    expect(clamp(3, playlistLength)).toBe(3);
    expect(clamp(10, playlistLength)).toBe(4);
    expect(clamp(0, 0)).toBe(0);
  });
});
