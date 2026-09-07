/**
 * FocusScroll Player Controller Contract
 */

export type PlayerState =
  | 'IDLE'
  | 'GESTURE_UNLOCK'
  | 'PLAYING'
  | 'PAUSED'
  | 'SWIPE_IN_PROGRESS'
  | 'BUFFERING'
  | 'TRANSITIONING';

export interface PlayerConfig {
  containerId: string;
  onStateChange: (state: PlayerState) => void;
  onError: (errorCode: number, videoId: string) => void;
  onBuffering: (isBuffering: boolean) => void;
}

export interface IPlayerController {
  initialize(config: PlayerConfig): Promise<void>;
  loadVideo(videoId: string): void;
  play(): void;
  pause(): void;
  togglePlayPause(): void;
  unlockAudio(): void;
  getCurrentState(): PlayerState;
  destroy(): void;
}
