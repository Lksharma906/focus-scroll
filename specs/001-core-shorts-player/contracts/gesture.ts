/**
 * FocusScroll Gesture Engine Contract
 */

export interface GestureConfig {
  velocityThreshold: number;       // Default: 300 px/s
  displacementRatio: number;       // Default: 0.30 (30% viewport height)
  animationDurationMs: number;     // Default: 250 ms
  reboundDurationMs: number;       // Default: 180 ms
}

export type SwipeDirection = 'up' | 'down';

export interface SwipeCommitEvent {
  direction: SwipeDirection;
  velocity: number;
  displacement: number;
}

export interface IGestureEngine {
  attach(element: HTMLElement, config?: Partial<GestureConfig>): void;
  detach(): void;
  lock(): void;                    // Disables touch tracking during transitions
  unlock(): void;
  onSwipeCommit(callback: (event: SwipeCommitEvent) => void): void;
  onTap(callback: () => void): void;
}
