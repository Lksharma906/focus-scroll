import { IGestureEngine, GestureConfig, SwipeCommitEvent } from '../types/gesture';
import { evaluateSwipeThreshold } from './thresholds';

export class GestureEngine implements IGestureEngine {
  private element: HTMLElement | null = null;
  private config: GestureConfig = {
    velocityThreshold: 300,
    displacementRatio: 0.30,
    animationDurationMs: 250,
    reboundDurationMs: 180
  };

  private startY = 0;
  private currentY = 0;
  private startTime = 0;
  private isTracking = false;
  private isLocked = false;

  private onSwipeCommitCallback: ((event: SwipeCommitEvent) => void) | null = null;
  private onTapCallback: (() => void) | null = null;
  private onDragMoveCallback: ((deltaY: number) => void) | null = null;
  private onDragEndCallback: (() => void) | null = null;

  attach(element: HTMLElement, config?: Partial<GestureConfig>): void {
    this.element = element;
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      this.element.addEventListener('pointerdown', this.handlePointerDown);
      this.element.addEventListener('pointermove', this.handlePointerMove);
      this.element.addEventListener('pointerup', this.handlePointerUp);
      this.element.addEventListener('pointercancel', this.handlePointerCancel);
    } else {
      this.element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      this.element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      this.element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
      this.element.addEventListener('touchcancel', this.handleTouchCancel, { passive: false });
    }

    this.element.addEventListener('wheel', this.handleWheel, { passive: true });
  }

  detach(): void {
    if (!this.element) return;
    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      this.element.removeEventListener('pointerdown', this.handlePointerDown);
      this.element.removeEventListener('pointermove', this.handlePointerMove);
      this.element.removeEventListener('pointerup', this.handlePointerUp);
      this.element.removeEventListener('pointercancel', this.handlePointerCancel);
    } else {
      this.element.removeEventListener('touchstart', this.handleTouchStart);
      this.element.removeEventListener('touchmove', this.handleTouchMove);
      this.element.removeEventListener('touchend', this.handleTouchEnd);
      this.element.removeEventListener('touchcancel', this.handleTouchCancel);
    }

    this.element.removeEventListener('wheel', this.handleWheel);
    this.element = null;
  }

  lock(): void {
    this.isLocked = true;
  }

  unlock(): void {
    this.isLocked = false;
  }

  onSwipeCommit(callback: (event: SwipeCommitEvent) => void): void {
    this.onSwipeCommitCallback = callback;
  }

  onTap(callback: () => void): void {
    this.onTapCallback = callback;
  }

  onDragMove(callback: (deltaY: number) => void): void {
    this.onDragMoveCallback = callback;
  }

  onDragEnd(callback: () => void): void {
    this.onDragEndCallback = callback;
  }

  private lastWheelTime = 0;
  private accumulatedWheelDelta = 0;

  private handleWheel = (e: WheelEvent): void => {
    if (this.isLocked) return;
    const now = performance.now();
    if (now - this.lastWheelTime > 350) {
      this.accumulatedWheelDelta = 0;
    }
    this.lastWheelTime = now;
    this.accumulatedWheelDelta += e.deltaY;

    if (Math.abs(this.accumulatedWheelDelta) >= 45) {
      const direction = this.accumulatedWheelDelta > 0 ? 'up' : 'down';
      this.accumulatedWheelDelta = 0;
      this.onSwipeCommitCallback?.({
        direction,
        velocity: 500,
        displacement: direction === 'up' ? -100 : 100
      });
    }
  };

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.isLocked || e.isPrimary === false) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.startY = e.clientY;
    this.currentY = e.clientY;
    this.startTime = performance.now();
    this.isTracking = true;
    try {
      this.element?.setPointerCapture(e.pointerId);
    } catch {}
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isTracking || this.isLocked) return;
    this.currentY = e.clientY;
    const deltaY = this.currentY - this.startY;

    if (e.cancelable) {
      e.preventDefault();
    }

    this.onDragMoveCallback?.(deltaY);
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (!this.isTracking) return;
    this.isTracking = false;

    try {
      if (this.element?.hasPointerCapture(e.pointerId)) {
        this.element.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (this.isLocked) {
      this.onDragEndCallback?.();
      return;
    }

    const elapsedMs = performance.now() - this.startTime;
    const deltaY = this.currentY - this.startY;
    const viewportHeight = window.innerHeight || 800;

    // Check for single tap: displacement < 10px and duration < 300ms
    if (Math.abs(deltaY) < 10 && elapsedMs < 300) {
      this.onDragEndCallback?.();
      this.onTapCallback?.();
      return;
    }

    const evaluation = evaluateSwipeThreshold({
      deltaY,
      elapsedMs,
      viewportHeight,
      velocityThreshold: this.config.velocityThreshold,
      displacementRatio: this.config.displacementRatio
    });

    if (evaluation.committed && evaluation.direction) {
      this.onSwipeCommitCallback?.({
        direction: evaluation.direction,
        velocity: evaluation.velocity,
        displacement: deltaY
      });
    } else {
      this.onDragEndCallback?.();
    }
  };

  private handlePointerCancel = (e: PointerEvent): void => {
    this.isTracking = false;
    try {
      if (this.element?.hasPointerCapture(e.pointerId)) {
        this.element.releasePointerCapture(e.pointerId);
      }
    } catch {}
    this.onDragEndCallback?.();
  };

  private handleTouchStart = (e: TouchEvent): void => {
    if (this.isLocked || e.touches.length > 1) return;
    const touch = e.touches[0];
    this.startY = touch.clientY;
    this.currentY = touch.clientY;
    this.startTime = performance.now();
    this.isTracking = true;
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.isTracking || this.isLocked) return;
    const touch = e.touches[0];
    this.currentY = touch.clientY;
    const deltaY = this.currentY - this.startY;

    if (e.cancelable) {
      e.preventDefault();
    }

    this.onDragMoveCallback?.(deltaY);
  };

  private handleTouchEnd = (): void => {
    if (!this.isTracking) return;
    this.isTracking = false;

    if (this.isLocked) {
      this.onDragEndCallback?.();
      return;
    }

    const elapsedMs = performance.now() - this.startTime;
    const deltaY = this.currentY - this.startY;
    const viewportHeight = window.innerHeight || 800;

    // Check for single tap: displacement < 10px and duration < 300ms
    if (Math.abs(deltaY) < 10 && elapsedMs < 300) {
      this.onDragEndCallback?.();
      this.onTapCallback?.();
      return;
    }

    const evaluation = evaluateSwipeThreshold({
      deltaY,
      elapsedMs,
      viewportHeight,
      velocityThreshold: this.config.velocityThreshold,
      displacementRatio: this.config.displacementRatio
    });

    if (evaluation.committed && evaluation.direction) {
      this.onSwipeCommitCallback?.({
        direction: evaluation.direction,
        velocity: evaluation.velocity,
        displacement: deltaY
      });
    } else {
      this.onDragEndCallback?.();
    }
  };

  private handleTouchCancel = (): void => {
    this.isTracking = false;
    this.onDragEndCallback?.();
  };
}
