import { describe, it, expect } from 'vitest';
import { buildYouTubePlayerVars } from '../../src/player/yt-loader';

describe('YouTube IFrame Configuration (P1 & G3 Invariants)', () => {
  it('enforces all required distraction-free parameters', () => {
    const vars = buildYouTubePlayerVars();
    expect(vars.controls).toBe(0);
    expect(vars.rel).toBe(0);
    expect(vars.modestbranding).toBe(1);
    expect(vars.playsinline).toBe(1);
    expect(vars.fs).toBe(0);
    expect(vars.disablekb).toBe(1);
    expect(vars.loop).toBe(0); // Play-once clarified requirement
    expect(vars.iv_load_policy).toBe(3); // Annotations off
  });
});
