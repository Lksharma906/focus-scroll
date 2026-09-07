import { PlayerState } from '../types/player';

export type StateAction =
  | 'LOAD_VIDEO'
  | 'UNLOCK_GESTURE'
  | 'PLAY'
  | 'PAUSE'
  | 'TAP_TOGGLE'
  | 'BUFFER_START'
  | 'BUFFER_END'
  | 'SWIPE_START'
  | 'SWIPE_CANCEL'
  | 'SWIPE_COMMIT'
  | 'VIDEO_READY'
  | 'VIDEO_ENDED'
  | 'ERROR_OCCURRED';

export class PlayerStateMachine {
  private state: PlayerState = 'IDLE';
  private ended = false;
  private audioUnlocked = false;

  getState(): PlayerState {
    return this.state;
  }

  isAudioUnlocked(): boolean {
    return this.audioUnlocked;
  }

  isEnded(): boolean {
    return this.ended;
  }

  transition(action: StateAction): PlayerState {
    switch (action) {
      case 'LOAD_VIDEO':
        this.ended = false;
        if (!this.audioUnlocked) {
          this.state = 'GESTURE_UNLOCK';
        } else {
          this.state = 'BUFFERING';
        }
        break;

      case 'UNLOCK_GESTURE':
        this.audioUnlocked = true;
        this.ended = false;
        this.state = 'PLAYING';
        break;

      case 'PLAY':
        this.ended = false;
        this.state = 'PLAYING';
        break;

      case 'PAUSE':
        this.state = 'PAUSED';
        break;

      case 'TAP_TOGGLE':
        if (this.state === 'PLAYING') {
          this.state = 'PAUSED';
        } else if (this.state === 'PAUSED') {
          this.ended = false;
          this.state = 'PLAYING';
        }
        break;

      case 'BUFFER_START':
        if (this.state === 'PLAYING') {
          this.state = 'BUFFERING';
        }
        break;

      case 'BUFFER_END':
      case 'VIDEO_READY':
        if (this.audioUnlocked && this.state !== 'PAUSED') {
          this.state = 'PLAYING';
        }
        break;

      case 'SWIPE_START':
        if (this.state === 'PLAYING' || this.state === 'PAUSED') {
          this.state = 'SWIPE_IN_PROGRESS';
        }
        break;

      case 'SWIPE_CANCEL':
        if (this.state === 'SWIPE_IN_PROGRESS') {
          this.state = this.ended ? 'PAUSED' : 'PLAYING';
        }
        break;

      case 'SWIPE_COMMIT':
        this.state = 'TRANSITIONING';
        this.ended = false;
        break;

      case 'VIDEO_ENDED':
        this.ended = true;
        this.state = 'PAUSED';
        break;

      case 'ERROR_OCCURRED':
        // State remains or enters buffering until auto-skip
        break;
    }

    return this.state;
  }
}
