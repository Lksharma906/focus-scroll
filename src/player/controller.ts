import { IPlayerController, PlayerConfig, PlayerState } from '../types/player';
import { buildYouTubePlayerVars, loadYouTubeIFrameAPI } from './yt-loader';
import { PlayerStateMachine } from './state-machine';

interface YTPlayerInstance {
  loadVideoById(videoId: string | { videoId: string; startSeconds?: number }): void;
  cueVideoById(videoId: string | { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  unMute(): void;
  mute(): void;
  isMuted(): boolean;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getPlayerState(): number;
  destroy(): void;
}

export class PlayerController implements IPlayerController {
  private player: YTPlayerInstance | null = null;
  private config: PlayerConfig | null = null;
  private stateMachine = new PlayerStateMachine();
  private currentVideoId = '';
  private bufferTimer: ReturnType<typeof setTimeout> | null = null;
  private consecutiveErrors = 0;

  async initialize(config: PlayerConfig): Promise<void> {
    this.config = config;
    await loadYouTubeIFrameAPI();

    return new Promise((resolve) => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      const timer = setTimeout(done, 2500);

      const YT = (window as unknown as { YT: { Player: new (id: string, opts: unknown) => YTPlayerInstance } }).YT;
      this.player = new YT.Player(config.containerId, {
        width: '100%',
        height: '100%',
        playerVars: buildYouTubePlayerVars(),
        events: {
          onReady: () => {
            clearTimeout(timer);
            done();
          },
          onStateChange: (event: { data: number }) => {
            this.handleYTStateChange(event.data);
          },
          onError: (event: { data: number }) => {
            this.handleYTError(event.data);
          }
        }
      });
    });
  }

  getCurrentState(): PlayerState {
    return this.stateMachine.getState();
  }

  isEnded(): boolean {
    return this.stateMachine.isEnded();
  }

  loadVideo(videoId: string): void {
    this.currentVideoId = videoId;
    this.consecutiveErrors = 0;

    if (!this.player) return;

    if (!this.stateMachine.isAudioUnlocked()) {
      // Audio gate waiting: cue or mute play
      this.stateMachine.transition('LOAD_VIDEO');
      this.player.cueVideoById(videoId);
    } else {
      // Unlocked session: programmatically load and play unmuted (P3 Compliance)
      this.stateMachine.transition('SWIPE_COMMIT');
      this.player.loadVideoById({ videoId, startSeconds: 0 });
      this.player.unMute();
      this.player.playVideo();
    }
    this.notifyState();
  }

  unlockAudio(): void {
    if (!this.player) return;
    this.stateMachine.transition('UNLOCK_GESTURE');
    this.player.unMute();
    if (this.currentVideoId) {
      this.player.loadVideoById({ videoId: this.currentVideoId, startSeconds: 0 });
      this.player.playVideo();
    }
    this.notifyState();
  }

  play(): void {
    if (!this.player) return;
    this.stateMachine.transition('PLAY');
    this.player.playVideo();
    this.notifyState();
  }

  pause(): void {
    if (!this.player) return;
    this.stateMachine.transition('PAUSE');
    this.player.pauseVideo();
    this.notifyState();
  }

  togglePlayPause(): void {
    if (!this.player) return;

    if (this.stateMachine.isEnded()) {
      // Replay from start
      this.replay();
      return;
    }

    const currentState = this.stateMachine.getState();
    if (currentState === 'PLAYING') {
      this.pause();
    } else if (currentState === 'PAUSED' || currentState === 'GESTURE_UNLOCK') {
      if (!this.stateMachine.isAudioUnlocked()) {
        this.unlockAudio();
      } else {
        this.play();
      }
    }
  }

  replay(): void {
    if (!this.player) return;
    this.player.seekTo(0, true);
    this.player.playVideo();
    this.stateMachine.transition('PLAY');
    this.notifyState();
  }

  private handleYTStateChange(ytState: number): void {
    // YT.PlayerState: ENDED (0), PLAYING (1), PAUSED (2), BUFFERING (3), CUED (5)
    if (ytState === 0) {
      // Video completed: play-once semantics (do not loop, do not auto-advance)
      this.stateMachine.transition('VIDEO_ENDED');
      this.notifyState();
    } else if (ytState === 1) {
      // PLAYING
      this.clearBufferTimer();
      this.stateMachine.transition('PLAY');
      this.config?.onBuffering(false);
      this.notifyState();
    } else if (ytState === 2) {
      // PAUSED
      this.clearBufferTimer();
      this.stateMachine.transition('PAUSE');
      this.config?.onBuffering(false);
      this.notifyState();
    } else if (ytState === 3) {
      // BUFFERING
      this.bufferTimer = setTimeout(() => {
        this.stateMachine.transition('BUFFER_START');
        this.config?.onBuffering(true);
        this.notifyState();
      }, 500);
    }
  }

  private handleYTError(code: number): void {
    this.consecutiveErrors++;
    this.config?.onError(code, this.currentVideoId);
  }

  private clearBufferTimer(): void {
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
      this.bufferTimer = null;
    }
  }

  private notifyState(): void {
    this.config?.onStateChange(this.stateMachine.getState());
  }

  destroy(): void {
    this.clearBufferTimer();
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
  }
}
