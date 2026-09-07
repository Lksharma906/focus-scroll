import { storage } from './storage/db';
import { SEED_SHORTS } from './storage/seed';
import { FeedManager } from './components/feed';
import { HUD } from './components/hud';
import { BufferingSpinner } from './components/spinner';
import { ToastManager } from './components/toast';
import { PlaylistDrawer } from './components/drawer';
import { OnboardingScreen } from './components/onboarding';

class App {
  private root: HTMLElement;
  private feedManager: FeedManager | null = null;
  private hud: HUD;
  private spinner: BufferingSpinner;
  private toast: ToastManager;
  private drawer: PlaylistDrawer;
  private onboarding: OnboardingScreen;

  constructor() {
    this.root = document.getElementById('app') as HTMLElement;
    this.toast = new ToastManager();
    this.spinner = new BufferingSpinner();

    this.drawer = new PlaylistDrawer(storage, {
      onPlaylistUpdated: (items) => {
        if (this.feedManager) {
          this.feedManager.setPlaylist(items);
        } else if (items.length > 0) {
          this.startFeed();
        }
      },
      onToast: (msg) => this.toast.show(msg)
    });

    this.hud = new HUD(() => {
      this.drawer.open();
    });

    this.onboarding = new OnboardingScreen(
      async () => {
        // Load samples
        for (const item of SEED_SHORTS) {
          try {
            await storage.addItem(item);
          } catch {}
        }
        this.toast.show('Sample Shorts loaded');
        this.startFeed();
      },
      () => {
        // Open drawer
        this.drawer.open();
      }
    );

    const { backdrop, drawer: drawerEl } = this.drawer.getElements();
    document.body.appendChild(backdrop);
    document.body.appendChild(drawerEl);
  }

  async start(): Promise<void> {
    const store = await storage.load();

    if (store.items.length === 0) {
      this.root.appendChild(this.onboarding.getElement());
      this.onboarding.show();
    } else {
      this.startFeed();
    }
  }

  private async startFeed(): Promise<void> {
    this.onboarding.hide();
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
        this.root.innerHTML = '';
        this.root.appendChild(this.onboarding.getElement());
        this.onboarding.show();
      }
    });

    await this.feedManager.initialize();
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});
