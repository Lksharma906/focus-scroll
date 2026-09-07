import { describe, it, expect } from 'vitest';
import { PlayerStateMachine } from '../../src/player/state-machine';

describe('PlayerStateMachine', () => {
  it('initializes in IDLE state', () => {
    const sm = new PlayerStateMachine();
    expect(sm.getState()).toBe('IDLE');
  });

  it('transitions from IDLE to GESTURE_UNLOCK when video is cued', () => {
    const sm = new PlayerStateMachine();
    sm.transition('LOAD_VIDEO');
    expect(sm.getState()).toBe('GESTURE_UNLOCK');
  });

  it('transitions to PLAYING upon audio unlock gesture', () => {
    const sm = new PlayerStateMachine();
    sm.transition('LOAD_VIDEO');
    sm.transition('UNLOCK_GESTURE');
    expect(sm.getState()).toBe('PLAYING');
  });

  it('toggles between PLAYING and PAUSED on single tap', () => {
    const sm = new PlayerStateMachine();
    sm.transition('LOAD_VIDEO');
    sm.transition('UNLOCK_GESTURE');
    sm.transition('TAP_TOGGLE');
    expect(sm.getState()).toBe('PAUSED');
    sm.transition('TAP_TOGGLE');
    expect(sm.getState()).toBe('PLAYING');
  });

  it('enters ENDED state when video completes without auto-advancing', () => {
    const sm = new PlayerStateMachine();
    sm.transition('LOAD_VIDEO');
    sm.transition('UNLOCK_GESTURE');
    sm.transition('VIDEO_ENDED');
    expect(sm.getState()).toBe('PAUSED'); // Handled as PAUSED with replay flag
    expect(sm.isEnded()).toBe(true);
  });

  it('enters TRANSITIONING during swipe commit and returns to PLAYING when settled', () => {
    const sm = new PlayerStateMachine();
    sm.transition('LOAD_VIDEO');
    sm.transition('UNLOCK_GESTURE');
    sm.transition('SWIPE_COMMIT');
    expect(sm.getState()).toBe('TRANSITIONING');
    sm.transition('VIDEO_READY');
    expect(sm.getState()).toBe('PLAYING');
  });
});
