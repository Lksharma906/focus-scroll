import { StorageManager } from '../storage/db';
import { getYoutubeThumbnail } from '../utils/url-parser';
import { APP_VERSION } from '../config/version';

export interface HomeScreenCallbacks {
  onPlayFeed: (listId: string, shuffle?: boolean) => void;
  onOpenDrawer: (listId?: string) => void;
  onOpenVersionControl: () => void;
  onOpenBackupRestore?: () => void;
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
    const customLists = lists.filter((l) => l.id !== 'default');
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
              <span>v${APP_VERSION}</span>
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
          <!-- Featured Hero: Main Feed -->
          <section class="home-hero-card" id="home-hero-card" title="Tap to Play Main Feed">
            <div class="hero-top-row">
              <div class="hero-badge">
                <span class="pulse-dot"></span>
                <span>Main Feed</span>
              </div>
              <span class="hero-stat-pill">${totalVideos} video${totalVideos === 1 ? '' : 's'}</span>
            </div>

            <div class="hero-info">
              <div class="hero-heading-row">
                <div class="hero-heading-text">
                  <h2 class="hero-heading">Main Feed</h2>
                  <p class="hero-subtext">
                    ${totalVideos > 0
                      ? `All ${totalVideos} videos across your playlists in one continuous stream.`
                      : 'Consolidates all videos across all your playlists in one stream.'}
                  </p>
                </div>
                <div class="hero-play-circle" id="home-hero-circle-btn" title="Play Main Feed" aria-label="Play Main Feed">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="6 4 20 12 6 20 6 4"></polygon>
                  </svg>
                </div>
              </div>

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
                      <span class="hero-thumb-more">${totalVideos} short${totalVideos === 1 ? '' : 's'} ready</span>
                    </div>`
                  : ''
              }
            </div>

            <div class="hero-actions-row">
              <button type="button" class="btn-hero-play" id="home-hero-play-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>${totalVideos > 0 ? 'Play Main Feed' : 'Add Videos First'}</span>
              </button>
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
                <h3 class="section-title">Playlists</h3>
                <span class="section-count">${customLists.length} playlist${customLists.length === 1 ? '' : 's'}</span>
              </div>
              <div class="section-header-actions">
                <button type="button" class="btn-backup-pill" id="home-btn-backup" title="Backup & Restore all playlists and video links">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                  <span>Backup & Restore</span>
                </button>
                <button type="button" class="btn-new-list-pill" id="home-btn-create-list" title="Create a new custom playlist">
                  <span>+ New List</span>
                </button>
              </div>
            </div>

            <div class="playlists-grid" id="home-playlists-grid">
              ${
                customLists.length > 0
                  ? customLists
                      .map((list) => {
                        const count = list.items.length;
                        const firstVideo = list.items[0];
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
                              <div class="playlist-card-meta">${count > 0 ? `${count} video${count === 1 ? '' : 's'}` : 'Empty List'}</div>
                            </div>
                            <div class="playlist-card-actions">
                              <button type="button" class="btn-card-action btn-add-card" data-id="${list.id}" title="Add videos to ${list.name}">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span>Add</span>
                              </button>
                              <button type="button" class="btn-card-action btn-play-card ${count === 0 ? 'btn-play-card-empty' : ''}" data-id="${list.id}" title="${count > 0 ? `Play ${list.name}` : 'Add videos first'}">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                </svg>
                                <span>Play</span>
                              </button>
                            </div>
                          </div>
                        `;
                      })
                      .join('')
                  : `<div class="playlists-empty-hint">
                      <p>No custom playlists yet. Use <strong>+ New List</strong> to organize your shorts into categories.</p>
                    </div>`
              }
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
              FocusScroll v${APP_VERSION} • Offline PWA • Intentional YouTube Shorts
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

    // Main Feed Hero actions - whole card or button triggers playback
    const heroCard = this.element.querySelector('#home-hero-card');
    heroCard?.addEventListener('click', async () => {
      const consolidated = await this.storage.getConsolidatedVideos();
      if (consolidated.length === 0) {
        this.callbacks.onOpenDrawer('default');
      } else {
        this.callbacks.onPlayFeed('default', false);
      }
    });

    // Empty state buttons
    this.element.querySelector('#btn-home-load-samples')?.addEventListener('click', async () => {
      await this.callbacks.onLoadSamples();
      await this.render();
    });

    this.element.querySelector('#btn-home-add-video')?.addEventListener('click', () => {
      this.callbacks.onOpenDrawer();
    });

    // Backup & Restore button
    this.element.querySelector('#home-btn-backup')?.addEventListener('click', () => {
      if (this.callbacks.onOpenBackupRestore) {
        this.callbacks.onOpenBackupRestore();
      } else {
        this.callbacks.onOpenDrawer();
      }
    });

    // New List button
    this.element.querySelector('#home-btn-create-list')?.addEventListener('click', () => {
      this.callbacks.onOpenDrawer();
    });

    // Individual playlist cards
    this.element.querySelectorAll('.playlist-card').forEach((cardEl) => {
      const listId = (cardEl as HTMLElement).getAttribute('data-id');
      if (!listId) return;

      // Click on Add button
      cardEl.querySelector('.btn-add-card')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.storage.switchList(listId);
        this.callbacks.onOpenDrawer(listId);
      });

      // Click on Play button
      cardEl.querySelector('.btn-play-card')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const videos = (await this.storage.getLists()).find((l) => l.id === listId)?.items || [];
        if (videos.length === 0) {
          this.callbacks.onToast('Playlist is empty — add videos first!');
          await this.storage.switchList(listId);
          this.callbacks.onOpenDrawer(listId);
        } else {
          this.callbacks.onPlayFeed(listId, false);
        }
      });

      // Click anywhere else on the card
      cardEl.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.btn-add-card') || target.closest('.btn-play-card')) {
          return;
        }

        const videos = (await this.storage.getLists()).find((l) => l.id === listId)?.items || [];
        if (videos.length === 0) {
          await this.storage.switchList(listId);
          this.callbacks.onOpenDrawer(listId);
        } else {
          this.callbacks.onPlayFeed(listId, false);
        }
      });
    });
  }
}
