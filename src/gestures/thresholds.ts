export interface SwipeEvaluationParams {
  deltaY: number;        // negative for upward, positive for downward
  elapsedMs: number;
  viewportHeight: number;
  velocityThreshold?: number;       // default: 300 px/s
  displacementRatio?: number;       // default: 0.30
}

export interface SwipeEvaluationResult {
  committed: boolean;
  direction: 'up' | 'down' | null;
  velocity: number;
  displacementRatio: number;
}

export function evaluateSwipeThreshold(params: SwipeEvaluationParams): SwipeEvaluationResult {
  const {
    deltaY,
    elapsedMs,
    viewportHeight,
    velocityThreshold = 300,
    displacementRatio = 0.30
  } = params;

  const safeElapsed = Math.max(elapsedMs, 1);
  const velocity = (Math.abs(deltaY) / safeElapsed) * 1000; // px/s
  const actualDisplacementRatio = Math.abs(deltaY) / Math.max(viewportHeight, 1);

  const direction: 'up' | 'down' = deltaY < 0 ? 'up' : 'down';
  const committed = velocity >= velocityThreshold || actualDisplacementRatio >= displacementRatio;

  return {
    committed: Math.abs(deltaY) > 10 && committed,
    direction: committed ? direction : null,
    velocity,
    displacementRatio: actualDisplacementRatio
  };
}
