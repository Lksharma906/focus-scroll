import { StorageManager } from '../storage/db';
import { getYoutubeThumbnail } from '../utils/url-parser';

export interface HomeScreenCallbacks {
  onPlayFeed: (listId: string, shuffle?: boolean) => void;
  onOpenDrawer: (listId?: string) => void;
  onOpenVersionControl: () => void;
  onLoadSamples: () => Promise<void>;
  onToast: (msg: string) => void;
}

export class HomeScreen {
  private element: HTMLElement;
  private storage: StorageManager;
  private callbacks: HomeScreenCallbacks;

  constructor(storage: StorageManager, callbacks: HomeScreenCallbacks) {
    this.storage = storage;
    this.callbacks = callbacks;

    this.element = document.createElement('div');
    this.element.className = 'home-screen';

    this.render();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  show(): void {
    this.element.style.display = 'flex';
    this.render();
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  async render(): Promise<void> {
    const store = await this.storage.load();
    const lists = store.lists || [];
    const consolidated = await this.storage.getConsolidatedVideos();
    const totalVideos = consolidated.length;

    // Collect preview thumbnails (up to 4 unique videos)
    const previewThumbs = consolidated.slice(0, 4).map((v) => ({
      id: v.id,
      url: getYoutubeThumbnail(v.id)
    }));

    this.element.innerHTML = `
      <div class="home-container">
        <!-- Top App Bar -->
        <header class="home-header">
          <div class="home-brand">
            <div class="home-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <div>
              <h1 class="home-brand-title">FocusScroll</h1>
              <p class="home-brand-tagline">Intentional Shorts • Zero Algorithms</p>
            </div>
          </div>
          <div class="home-header-actions">
            <button type="button" class="home-version-btn" id="home-btn-version" title="Version Control & Snapshots">
              <span>v1.0.0</span>
            </button>
            <button type="button" class="home-icon-btn" id="home-btn-drawer" title="Manage Playlists">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>

        <main class="home-main-scroll">
          <!-- Featured Hero: Consolidated Main Feed -->
          <section class="home-hero-card">
            <div class="hero-top-row">
              <div class="hero-badge">
                <span class="pulse-dot"></span>
                <span>Consolidated Main Feed</span>
              </div>
              <span class="hero-stat-pill">${totalVideos} video${totalVideos === 1 ? '' : 's'}</span>
            </div>

            <div class="hero-info">
              <h2 class="hero-heading">Dopamine Scroll Mix</h2>
              <p class="hero-subtext">
                All ${totalVideos} videos across ${lists.length} playlists consolidated into an algorithm-free, randomized stream.
              </p>

              ${
                previewThumbs.length > 0
                  ? `<div class="hero-thumb-strip">
                      ${previewThumbs
                        .map(
                          (t, i) => `
                        <div class="hero-thumb-wrap" style="z-index: ${4 - i};">
                          <img src="${t.url}" alt="Thumbnail preview" class="hero-thumb-img" />
                        </div>
                      `
                        )
                        .join('')}
                    </div>`
                  : ''
              }
            </div>

            <div class="hero-actions-row">
              <button type="button" class="btn-hero-play" id="home-hero-play-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>${totalVideos > 0 ? 'Play Main Feed (Shuffle)' : 'Add Videos First'}</span>
              </button>

              ${
                totalVideos > 1
                  ? `<button type="button" class="btn-hero-shuffle" id="home-hero-shuffle-btn" title="Re-shuffle order & play">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="16 3 21 3 21 8"></polyline>
                        <line x1="4" y1="20" x2="21" y2="3"></line>
                        <polyline points="21 16 21 21 16 21"></polyline>
                        <line x1="15" y1="15" x2="21" y2="21"></line>
                        <line x1="4" y1="4" x2="9" y2="9"></line>
                      </svg>
                    </button>`
                  : ''
              }
            </div>
          </section>

          ${
            totalVideos === 0
              ? `<!-- Empty State Prompt -->
                <div class="home-empty-card">
                  <div class="empty-sparkle">✨</div>
                  <h3 class="empty-title">Your Feed is Ready to Curate</h3>
                  <p class="empty-desc">Break free from endless doomscrolling. Add your favorite channels or load starter shorts.</p>
                  <div class="empty-btns">
                    <button type="button" class="btn-primary" id="btn-home-load-samples">⚡ Load Sample Shorts</button>
                    <button type="button" class="btn-secondary" id="btn-home-add-video">+ Add Video Manually</button>
                  </div>
                </div>`
              : ''
          }

          <!-- Playlists Selection Section -->
          <section class="home-playlists-section">
            <div class="section-header-row">
              <div>
                <h3 class="section-title">Playlists & Feeds</h3>
                <span class="section-count">${lists.length} feed${lists.length === 1 ? '' : 's'} available</span>
              </div>
              <button type="button" class="btn-new-list-pill" id="home-btn-create-list" title="Create a new custom playlist">
                <span>+ New List</span>
              </button>
            </div>

            <div class="playlists-grid" id="home-playlists-grid">
              ${lists
                .map((list) => {
                  const isMain = list.id === 'default';
                  const count = isMain ? totalVideos : list.items.length;
                  const firstVideo = isMain
                    ? consolidated[0]
                    : list.items[0];
                  const thumb = firstVideo ? getYoutubeThumbnail(firstVideo.id) : '';

                  return `
                    <div class="playlist-card ${list.id === store.activeListId ? 'active-list' : ''}" data-id="${list.id}">
                      <div class="playlist-card-cover">
                        ${
                          thumb
                            ? `<img src="${thumb}" alt="${list.name}" class="playlist-card-img" />`
                            : `<div class="playlist-card-placeholder">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                              </div>`
                        }
                        <span class="playlist-card-badge">${count} video${count === 1 ? '' : 's'}</span>
                      </div>
                      <div class="playlist-card-info">
                        <div class="playlist-card-title">${list.name}</div>
                        <div class="playlist-card-meta">${isMain ? 'Consolidated Feed' : count > 0 ? 'Custom List' : 'Empty List'}</div>
                      </div>
                      <div class="playlist-card-actions">
                        ${
                          count > 0
                            ? `<button type="button" class="btn-play-card" data-id="${list.id}" title="Play ${list.name}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                                <span>Play</span>
                              </button>`
                            : `<button type="button" class="btn-add-card" data-id="${list.id}" title="Add videos">
                                <span>+ Add</span>
                              </button>`
                        }
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          </section>

          <!-- Bottom Utility Footer -->
          <footer class="home-bottom-footer">
            <div class="footer-links">
              <button type="button" class="footer-link-btn" id="footer-btn-version">
                ⎇ Version Control & Snapshots
              </button>
              <span class="footer-sep">•</span>
              <button type="button" class="footer-link-btn" id="footer-btn-manage">
                Manage Playlists
              </button>
            </div>
            <div class="footer-copy">
              FocusScroll v1.0.0 • Offline PWA • Intentional YouTube Shorts
            </div>
          </footer>
        </main>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    // Header actions
    this.element.querySelector('#home-btn-version')?.addEventListener('click', () => {
      this.callbacks.onOpenVersionControl();
    });

    this.element.querySelector('#footer-btn-version')?.addEventListener('click', () => {
      this.callbacks.onOpenVersionControl();
    });

    this.element.querySelector('#home-btn-drawer')?.addEventListener('click', () => {
      this.callbacks.onOpenDrawer();
    });

    this.element.querySelector('#footer-btn-manage')?.addEventListener('click', () => {
      this.callbacks.onOpenDrawer();
    });

    // Main Feed Hero actions
    this.element.querySelector('#home-hero-play-btn')?.addEventListener('click', async () => {
      const consolidated = await this.storage.getConsolidatedVideos();
      if (consolidated.length === 0) {
        this.callbacks.onOpenDrawer('default');
      } else {
        this.callbacks.onPlayFeed('default', true); // Shuffle on play
      }
    });

    this.element.querySelector('#home-hero-shuffle-btn')?.addEventListener('click', () => {
      this.callbacks.onPlayFeed('default', true);
    });

    // Empty state buttons
    this.element.querySelector('#btn-home-load-samples')?.addEventListener('click', async () => {
      await this.callbacks.onLoadSamples();
      await this.render();
    });

    this.element.querySelector('#btn-home-add-video')?.addEventListener('click', () => {
      this.callbacks.onOpenDrawer();
    });

    // New List button
    this.element.querySelector('#home-btn-create-list')?.addEventListener('click', () => {
      this.callbacks.onOpenDrawer();
    });

    // Individual playlist cards
    this.element.querySelectorAll('.playlist-card').forEach((cardEl) => {
      const listId = (cardEl as HTMLElement).getAttribute('data-id');
      if (!listId) return;

      cardEl.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.btn-add-card')) {
          e.stopPropagation();
          await this.storage.switchList(listId);
          this.callbacks.onOpenDrawer(listId);
          return;
        }

        const isMain = listId === 'default';
        const videos = isMain
          ? await this.storage.getConsolidatedVideos()
          : (await this.storage.getLists()).find((l) => l.id === listId)?.items || [];

        if (videos.length === 0) {
          await this.storage.switchList(listId);
          this.callbacks.onOpenDrawer(listId);
        } else {
          this.callbacks.onPlayFeed(listId, isMain);
        }
      });
    });
  }
}
