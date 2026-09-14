// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GestureEngine } from '../../src/gestures/engine';

describe('Android Touch Gesture & Pointer Events', () => {
  let engine: GestureEngine;
  let element: HTMLDivElement;

  beforeEach(() => {
    // Ensure PointerEvent exists in jsdom
    if (!('PointerEvent' in window)) {
      (window as any).PointerEvent = class PointerEvent extends MouseEvent {
        pointerId: number;
        isPrimary: boolean;
        pointerType: string;
        constructor(type: string, params: any = {}) {
          super(type, params);
          this.pointerId = params.pointerId ?? 1;
          this.isPrimary = params.isPrimary ?? true;
          this.pointerType = params.pointerType ?? 'touch';
        }
      };
    }

    engine = new GestureEngine();
    element = document.createElement('div');
    element.className = 'touch-overlay';
    document.body.appendChild(element);

    // Mock setPointerCapture and releasePointerCapture in jsdom
    element.setPointerCapture = vi.fn();
    element.releasePointerCapture = vi.fn();
    element.hasPointerCapture = vi.fn().mockReturnValue(true);
  });

  it('sets touch-action to none on element attachment to prevent Android browser pan takeover', () => {
    engine.attach(element);
    expect(element.style.touchAction).toBe('none');
  });

  it('resets touch-action on detachment', () => {
    engine.attach(element);
    expect(element.style.touchAction).toBe('none');
    engine.detach();
    expect(element.style.touchAction).toBe('');
  });

  it('tracks pointer gestures and commits swipe up for Android finger drag', () => {
    engine.attach(element, { velocityThreshold: 300, displacementRatio: 0.2 });

    const dragMoveSpy = vi.fn();
    const swipeCommitSpy = vi.fn();
    const dragEndSpy = vi.fn();

    engine.onDragMove(dragMoveSpy);
    engine.onSwipeCommit(swipeCommitSpy);
    engine.onDragEnd(dragEndSpy);

    // 1. Pointer down at Y = 500
    const downEvent = new (window as any).PointerEvent('pointerdown', {
      clientY: 500,
      pointerId: 1,
      isPrimary: true,
      button: 0
    });
    element.dispatchEvent(downEvent);

    expect(element.setPointerCapture).toHaveBeenCalledWith(1);

    // 2. Pointer move upward to Y = 350 (delta = -150)
    const moveEvent = new (window as any).PointerEvent('pointermove', {
      clientY: 350,
      pointerId: 1,
      cancelable: true
    });
    element.dispatchEvent(moveEvent);

    expect(dragMoveSpy).toHaveBeenCalledWith(-150);

    // 3. Pointer up at Y = 300 (delta = -200)
    const upEvent = new (window as any).PointerEvent('pointerup', {
      clientY: 300,
      pointerId: 1
    });
    element.dispatchEvent(upEvent);

    expect(swipeCommitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'up',
        displacement: -200
      })
    );
  });

  it('handles pointercancel cleanly by releasing tracking and snapping back', () => {
    engine.attach(element);

    const dragEndSpy = vi.fn();
    const swipeCommitSpy = vi.fn();

    engine.onDragEnd(dragEndSpy);
    engine.onSwipeCommit(swipeCommitSpy);

    // Pointer down
    const downEvent = new (window as any).PointerEvent('pointerdown', {
      clientY: 400,
      pointerId: 1,
      isPrimary: true,
      button: 0
    });
    element.dispatchEvent(downEvent);

    // Pointer cancel (e.g. system notification or OS edge gesture)
    const cancelEvent = new (window as any).PointerEvent('pointercancel', {
      pointerId: 1
    });
    element.dispatchEvent(cancelEvent);

    expect(dragEndSpy).toHaveBeenCalled();
    expect(swipeCommitSpy).not.toHaveBeenCalled();
  });

  it('correctly triggers tap callback on minimal movement and short duration', async () => {
    engine.attach(element);

    const tapSpy = vi.fn();
    const swipeCommitSpy = vi.fn();

    engine.onTap(tapSpy);
    engine.onSwipeCommit(swipeCommitSpy);

    const downEvent = new (window as any).PointerEvent('pointerdown', {
      clientY: 300,
      pointerId: 1,
      isPrimary: true,
      button: 0
    });
    element.dispatchEvent(downEvent);

    const upEvent = new (window as any).PointerEvent('pointerup', {
      clientY: 302, // only 2px movement
      pointerId: 1
    });
    element.dispatchEvent(upEvent);

    expect(tapSpy).toHaveBeenCalled();
    expect(swipeCommitSpy).not.toHaveBeenCalled();
  });
});
