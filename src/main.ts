import { storage } from './storage/db';
import { SEED_SHORTS } from './storage/seed';
import { FeedManager } from './components/feed';
import { HUD } from './components/hud';
import { BufferingSpinner } from './components/spinner';
import { ToastManager } from './components/toast';
import { PlaylistDrawer } from './components/drawer';
import { HomeScreen } from './components/home';
import { VideoEntry } from './types/storage';

class App {
  private root: HTMLElement;
  private feedManager: FeedManager | null = null;
  private hud: HUD;
  private spinner: BufferingSpinner;
  private toast: ToastManager;
  private drawer: PlaylistDrawer;
  private homeScreen: HomeScreen;

  constructor() {
    this.root = document.getElementById('app') as HTMLElement;
    this.toast = new ToastManager();
    this.spinner = new BufferingSpinner();

    this.homeScreen = new HomeScreen(storage, {
      onPlayFeed: async (listId) => {
        if (listId === 'default') {
          const videos = await storage.getConsolidatedVideos();
          if (videos.length === 0) {
            this.drawer.open();
            this.toast.show('No videos in any playlist yet');
          } else {
            await this.startFeed(videos, 0);
          }
        } else {
          await storage.switchList(listId);
          const videos = await storage.getFeedVideos(listId);
          if (videos.length === 0) {
            this.drawer.open();
            this.toast.show('This list is empty. Add videos to play!');
          } else {
            await this.startFeed(videos, 0);
          }
        }
      },
      onOpenDrawer: async (listId) => {
        if (listId) {
          try {
            await storage.switchList(listId);
          } catch {}
        }
        this.drawer.open();
      },
      onOpenVersionControl: () => {
        this.drawer.openVersionControl();
      },
      onLoadSamples: async () => {
        for (const item of SEED_SHORTS) {
          try {
            await storage.addItem(item);
          } catch {}
        }
        this.toast.show('Sample Shorts loaded!');
        await this.homeScreen.render();
      },
      onToast: (msg) => this.toast.show(msg)
    });

    this.drawer = new PlaylistDrawer(storage, {
      onPlaylistUpdated: async (items, targetIndex) => {
        await this.homeScreen.render();
        if (items.length === 0) {
          if (this.feedManager) {
            this.feedManager.setPlaylist(items, targetIndex);
          } else {
            this.showHomeScreen();
          }
        } else if (this.feedManager) {
          this.feedManager.setPlaylist(items, targetIndex);
        }
      },
      onSelectVideo: (index) => {
        if (this.feedManager) {
          this.feedManager.goToIndex(index);
        } else {
          this.startFeed(undefined, index);
        }
      },
      onToast: (msg) => this.toast.show(msg),
      onClose: async () => {
        await this.homeScreen.render();
        if (!this.feedManager) {
          this.showHomeScreen();
        } else {
          const store = await storage.load();
          const activeList = store.lists.find((l) => l.id === store.activeListId) || store.lists[0];
          const isMain = store.activeListId === 'default';
          const count = isMain
            ? (await storage.getConsolidatedVideos()).length
            : activeList.items.length;

          if (count === 0) {
            this.showHomeScreen();
          }
        }
      }
    });

    this.hud = new HUD({
      onOpenDrawer: () => this.drawer.open(),
      onHome: () => this.showHomeScreen(),
      onNext: () => this.feedManager?.next(),
      onPrevious: () => this.feedManager?.previous()
    });

    const { backdrop, drawer: drawerEl } = this.drawer.getElements();
    document.body.appendChild(backdrop);
    document.body.appendChild(drawerEl);
  }

  async start(): Promise<void> {
    this.root.appendChild(this.homeScreen.getElement());
    this.homeScreen.show();
  }

  private async showHomeScreen(): Promise<void> {
    if (this.feedManager) {
      this.feedManager.destroy();
      this.feedManager = null;
    }
    this.root.innerHTML = '';
    this.root.appendChild(this.homeScreen.getElement());
    this.homeScreen.show();
  }

  private async startFeed(initialVideos?: VideoEntry[], targetIndex?: number): Promise<void> {
    this.homeScreen.hide();
    this.root.innerHTML = '';

    const feedViewport = document.createElement('div');
    feedViewport.className = 'feed-viewport';
    this.root.appendChild(feedViewport);

    this.root.appendChild(this.hud.getElement());
    this.root.appendChild(this.spinner.getElement());

    this.feedManager = new FeedManager(feedViewport, storage, {
      onPositionChange: (index, total) => {
        this.hud.updatePosition(index, total);
      },
      onToast: (msg) => {
        this.toast.show(msg);
      },
      onEmptyState: () => {
        this.showHomeScreen();
      }
    });

    await this.feedManager.initialize(initialVideos, targetIndex);
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Request permanent storage from browser (iOS Safari / Android Chrome)
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(() => {});
  }

  const app = new App();
  app.start();
});
