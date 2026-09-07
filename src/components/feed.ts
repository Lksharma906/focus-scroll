import { GestureEngine } from '../gestures/engine';
import { calculateNextIndex } from '../gestures/navigation';
import { PlayerController } from '../player/controller';
import { StorageManager } from '../storage/db';
import { VideoEntry } from '../types/storage';
import { AudioGate } from './audio-gate';
import { PauseIndicator } from './pause-indicator';
import { ReplayOverlay } from './replay-overlay';

export interface FeedCallbacks {
  onPositionChange: (index: number, total: number) => void;
  onToast: (message: string) => void;
  onEmptyState: () => void;
}

export class FeedManager {
  private container: HTMLElement;
  private cardElement: HTMLElement;
  private wrapperElement: HTMLElement;
  

  private gestureEngine = new GestureEngine();
  private player = new PlayerController();
  private storage: StorageManager;

  private playlist: VideoEntry[] = [];
  private currentIndex = 0;
  private isTransitioning = false;

  private audioGate: AudioGate;
  private pauseIndicator: PauseIndicator;
  private replayOverlay: ReplayOverlay;
  private callbacks: FeedCallbacks;

  constructor(
    container: HTMLElement,
    storage: StorageManager,
    callbacks: FeedCallbacks
  ) {
    this.container = container;
    this.storage = storage;
    this.callbacks = callbacks;

    this.container.innerHTML = `
      <div class="video-card">
        <div class="video-frame-wrapper">
          <div id="yt-player-container" class="iframe-container"></div>
          <div class="touch-overlay"></div>
        </div>
      </div>
    `;

    this.cardElement = this.container.querySelector('.video-card') as HTMLElement;
    this.wrapperElement = this.container.querySelector('.video-frame-wrapper') as HTMLElement;
    

    // Attach overlays
    this.audioGate = new AudioGate(() => {
      this.player.unlockAudio();
    });
    this.wrapperElement.appendChild(this.audioGate.getElement());

    this.replayOverlay = new ReplayOverlay(() => {
      this.player.replay();
    });
    this.wrapperElement.appendChild(this.replayOverlay.getElement());

    this.pauseIndicator = new PauseIndicator();
    this.wrapperElement.appendChild(this.pauseIndicator.getElement());

    this.setupGestures();
  }

  async initialize(): Promise<void> {
    const store = await this.storage.load();
    this.playlist = store.items;

    if (this.playlist.length === 0) {
      this.callbacks.onEmptyState();
      return;
    }

    // Restore lastActiveIndex (Principle P4 & Clarified requirement)
    this.currentIndex =
      store.lastActiveIndex >= 0 && store.lastActiveIndex < this.playlist.length
        ? store.lastActiveIndex
        : 0;

    this.callbacks.onPositionChange(this.currentIndex + 1, this.playlist.length);

    await this.player.initialize({
      containerId: 'yt-player-container',
      onStateChange: (_state) => {
        if (this.player.isEnded()) {
          this.replayOverlay.show();
        } else {
          this.replayOverlay.hide();
        }
      },
      onError: (_code, _videoId) => {
        this.callbacks.onToast('Video unavailable — skipping');
        setTimeout(() => {
          this.navigate('up');
        }, 2000);
      },
      onBuffering: (_isBuffering) => {
        // Buffering managed by HUD
      }
    });

    this.loadActiveVideo();
  }

  private setupGestures(): void {
    const overlay = this.container.querySelector('.touch-overlay') as HTMLElement;
    this.gestureEngine.attach(overlay);

    this.gestureEngine.onDragMove((deltaY) => {
      if (this.isTransitioning) return;
      this.cardElement.style.transition = 'none';
      this.cardElement.style.transform = `translateY(${deltaY}px)`;
    });

    this.gestureEngine.onDragEnd(() => {
      if (this.isTransitioning) return;
      this.snapBack();
    });

    this.gestureEngine.onSwipeCommit((event) => {
      if (this.isTransitioning) return;
      this.navigate(event.direction);
    });

    this.gestureEngine.onTap(() => {
      if (this.player.isEnded()) {
        this.player.replay();
        this.replayOverlay.hide();
      } else {
        this.player.togglePlayPause();
        if (this.player.getCurrentState() === 'PAUSED') {
          this.pauseIndicator.trigger();
        }
      }
    });
  }

  private snapBack(): void {
    this.cardElement.style.transition = 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)';
    this.cardElement.style.transform = 'translateY(0px)';
  }

  private async navigate(direction: 'up' | 'down'): Promise<void> {
    const { nextIndex, wrapped, bounced } = calculateNextIndex(
      this.currentIndex,
      direction,
      this.playlist.length
    );

    if (bounced) {
      this.cardElement.style.transition = 'transform 0.15s ease-out';
      this.cardElement.style.transform = 'translateY(50px)';
      setTimeout(() => this.snapBack(), 150);
      this.callbacks.onToast('First video');
      return;
    }

    if (wrapped) {
      this.callbacks.onToast('Back to start');
    }

    this.isTransitioning = true;
    this.gestureEngine.lock();

    // Slide out animation
    const translateYOut = direction === 'up' ? '-100%' : '100%';
    const translateYIn = direction === 'up' ? '100%' : '-100%';

    this.cardElement.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
    this.cardElement.style.transform = `translateY(${translateYOut})`;

    setTimeout(async () => {
      this.currentIndex = nextIndex;
      await this.storage.saveActiveIndex(this.currentIndex);
      this.callbacks.onPositionChange(this.currentIndex + 1, this.playlist.length);

      this.loadActiveVideo();

      // Reset to incoming position without transition
      this.cardElement.style.transition = 'none';
      this.cardElement.style.transform = `translateY(${translateYIn})`;

      // Force layout repaint
      void this.cardElement.offsetHeight;

      // Animate in to 0
      this.cardElement.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
      this.cardElement.style.transform = 'translateY(0px)';

      setTimeout(() => {
        this.isTransitioning = false;
        this.gestureEngine.unlock();
      }, 250);
    }, 250);
  }

  private loadActiveVideo(): void {
    if (this.playlist.length === 0) return;
    const current = this.playlist[this.currentIndex];
    this.replayOverlay.hide();
    this.player.loadVideo(current.id);
  }

  setPlaylist(items: VideoEntry[], newIndex = 0): void {
    this.playlist = items;
    this.currentIndex = Math.min(Math.max(newIndex, 0), Math.max(items.length - 1, 0));
    this.callbacks.onPositionChange(this.currentIndex + 1, this.playlist.length);
    if (this.playlist.length > 0) {
      this.loadActiveVideo();
    } else {
      this.callbacks.onEmptyState();
    }
  }

  getPlayer(): PlayerController {
    return this.player;
  }

  destroy(): void {
    this.gestureEngine.detach();
    this.player.destroy();
  }
}
