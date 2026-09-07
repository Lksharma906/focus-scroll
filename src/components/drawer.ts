import { StorageManager } from '../storage/db';
import { triggerDownload } from '../storage/backup';
import { parseVideoInput, fetchVideoTitle, extractAllVideoIds, getYoutubeThumbnail } from '../utils/url-parser';
import { VideoEntry, Playlist } from '../types/storage';
import { SAMPLE_BATCH_SHORTS } from '../storage/seed';
import { APP_VERSION } from '../config/version';

export interface DrawerCallbacks {
  onPlaylistUpdated: (items: VideoEntry[], targetIndex?: number) => void;
  onSelectVideo: (index: number) => void;
  onToast: (msg: string) => void;
  onClose?: () => void;
}

export class PlaylistDrawer {
  private backdropElement: HTMLElement;
  private drawerElement: HTMLElement;
  private storage: StorageManager;
  private callbacks: DrawerCallbacks;

  private currentLists: Playlist[] = [];
  private activeListId = 'default';
  private debounceTimer: number | null = null;
  private activePreviewId: string | null = null;
  private activePreviewTitle: string | null = null;
  private isCreatingList = false;

  constructor(storage: StorageManager, callbacks: DrawerCallbacks) {
    this.storage = storage;
    this.callbacks = callbacks;

    this.backdropElement = document.createElement('div');
    this.backdropElement.className = 'drawer-backdrop';

    this.drawerElement = document.createElement('div');
    this.drawerElement.className = 'drawer';

    this.drawerElement.innerHTML = `
      <div class="drawer-header">
        <div class="drawer-header-left">
          <span class="drawer-title">My Playlists</span>
          <span class="drawer-badge-count" id="drawer-total-count">0 videos</span>
        </div>
        <div class="drawer-header-actions">
          <button type="button" class="btn-backup-header" id="btn-drawer-backup" title="Backup & Restore all playlists">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>Backup</span>
          </button>
          <button type="button" class="btn-new-list" id="btn-toggle-new-list" title="Create new playlist">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>New List</span>
          </button>
          <button class="drawer-close" aria-label="Back / Close drawer" title="Back / Close">✕</button>
        </div>
      </div>

      <!-- Playlist Tabs Bar -->
      <div class="playlist-tabs-bar">
        <div class="playlist-tabs-scroll" id="playlist-tabs-container"></div>
      </div>

      <!-- Inline Create Playlist Bar (Hidden by default) -->
      <div class="inline-create-list" id="inline-create-list" style="display: none;">
        <input
          type="text"
          class="input-field new-list-input"
          id="new-list-name-input"
          placeholder="Enter list name (e.g., Favorites, Chill, Gym)..."
          maxlength="30"
        />
        <button type="button" class="btn-primary" id="btn-create-list-confirm">Create</button>
        <button type="button" class="btn-secondary" id="btn-create-list-cancel">Cancel</button>
      </div>

      <div class="drawer-body">
        <!-- Add Video Section -->
        <div class="add-video-section">
          <div class="url-input-wrapper">
            <div class="url-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
            </div>
            <input
              type="text"
              class="input-field add-video-input"
              id="add-video-input"
              placeholder="Paste YouTube Short URL, ID, or batch links..."
              aria-label="YouTube video URL or ID"
            />
            <button type="button" class="btn-clear-input" id="btn-clear-input" title="Clear input" style="display: none;">✕</button>
            <button type="button" class="btn-paste-clipboard" id="btn-paste-clipboard" title="Paste from clipboard">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
              <span>Paste</span>
            </button>
          </div>

          <div class="input-error" id="add-video-error" style="display: none;"></div>

          <!-- Live Preview Card (Single Video) -->
          <div class="video-live-preview" id="video-live-preview" style="display: none;">
            <div class="preview-thumb-box">
              <img class="preview-thumb-img" id="preview-thumb-img" src="" alt="Thumbnail preview" />
              <span class="preview-badge" id="preview-format-badge">Shorts ⚡</span>
            </div>
            <div class="preview-details">
              <div class="preview-title" id="preview-title">Loading title...</div>
              <div class="preview-actions">
                <button type="button" class="btn-primary btn-sm" id="btn-preview-add">Add to List</button>
                <button type="button" class="btn-secondary btn-sm" id="btn-preview-play">Add & Play</button>
              </div>
            </div>
          </div>

          <!-- Batch Import Banner (Multiple Videos Detected) -->
          <div class="batch-preview-box" id="batch-preview-box" style="display: none;">
            <div class="batch-info">
              <span class="batch-icon">⚡</span>
              <span id="batch-count-text">3 YouTube videos detected</span>
            </div>
            <button type="button" class="btn-primary btn-sm" id="btn-batch-add">Add All to List</button>
          </div>

          <!-- Quick presets chips -->
          <div class="quick-presets-row">
            <span class="quick-presets-label">Quick test:</span>
            <button type="button" class="chip-btn" id="btn-sample-5">+ 5 Sample Shorts</button>
            <button type="button" class="chip-btn" id="btn-sample-all">+ 10 Batch Videos</button>
          </div>
        </div>

        <!-- Scrollable Playlist Items Area -->
        <div class="playlist-list-container">
          <div class="playlist-items-header">
            <span class="items-count-text" id="current-list-items-summary">Videos in this list</span>
            <button type="button" class="btn-text-danger" id="btn-clear-current-list" title="Clear all videos in this list" style="display: none;">
              Clear all
            </button>
          </div>
          <ul class="playlist-list" id="playlist-items-ul"></ul>
        </div>

        <!-- Version Control & Backup actions at bottom -->
        <div class="drawer-version-row">
          <button type="button" class="btn-version-modal" id="btn-open-version-modal" title="Version Control & Snapshots">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 3v6m0 6v6M3 12h6m6 0h6"></path>
            </svg>
            <span>Version Control</span>
            <span class="app-version-tag">v${APP_VERSION}</span>
          </button>
        </div>

        <div class="drawer-footer-actions">
          <button type="button" class="btn-secondary btn-unified-backup" id="btn-backup-all" style="flex: 1;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Backup All</span>
          </button>
          <button type="button" class="btn-secondary btn-unified-restore" id="btn-restore-all" style="flex: 1;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <span>Restore All</span>
          </button>
          <input type="file" class="file-input" accept=".json" style="display: none;" />
        </div>
      </div>
    `;

    this.backdropElement.addEventListener('click', () => this.close());
    this.drawerElement.querySelector('.drawer-close')?.addEventListener('click', () => this.close());

    this.setupPlaylistTabs();
    this.setupVideoInput();
    this.setupBackupActions();
    this.setupVersionControl();
  }

  getElements(): { backdrop: HTMLElement; drawer: HTMLElement } {
    return {
      backdrop: this.backdropElement,
      drawer: this.drawerElement
    };
  }

  // --- Playlist Tabs Management ---

  private setupPlaylistTabs(): void {
    const toggleNewListBtn = this.drawerElement.querySelector('#btn-toggle-new-list') as HTMLButtonElement;
    const inlineCreateBar = this.drawerElement.querySelector('#inline-create-list') as HTMLElement;
    const newListNameInput = this.drawerElement.querySelector('#new-list-name-input') as HTMLInputElement;
    const createListConfirmBtn = this.drawerElement.querySelector('#btn-create-list-confirm') as HTMLButtonElement;
    const createListCancelBtn = this.drawerElement.querySelector('#btn-create-list-cancel') as HTMLButtonElement;

    toggleNewListBtn.addEventListener('click', () => {
      this.isCreatingList = !this.isCreatingList;
      inlineCreateBar.style.display = this.isCreatingList ? 'flex' : 'none';
      if (this.isCreatingList) {
        newListNameInput.value = '';
        newListNameInput.focus();
      }
    });

    createListCancelBtn.addEventListener('click', () => {
      this.isCreatingList = false;
      inlineCreateBar.style.display = 'none';
    });

    const handleCreate = async () => {
      const name = newListNameInput.value.trim();
      if (!name) return;
      createListConfirmBtn.disabled = true;

      try {
        const newList = await this.storage.createList(name);
        this.isCreatingList = false;
        inlineCreateBar.style.display = 'none';
        newListNameInput.value = '';

        await this.refreshState();
        this.callbacks.onPlaylistUpdated([], 0);
        this.callbacks.onToast(`Created list: ${newList.name}`);
      } catch (err) {
        this.callbacks.onToast(err instanceof Error ? err.message : 'Failed to create list');
      } finally {
        createListConfirmBtn.disabled = false;
      }
    };

    createListConfirmBtn.addEventListener('click', handleCreate);
    newListNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCreate();
      } else if (e.key === 'Escape') {
        this.isCreatingList = false;
        inlineCreateBar.style.display = 'none';
      }
    });

    // Clear current list button
    const clearListBtn = this.drawerElement.querySelector('#btn-clear-current-list') as HTMLButtonElement;
    clearListBtn.addEventListener('click', () => {
      const activeList = this.currentLists.find((l) => l.id === this.activeListId);
      if (!activeList || activeList.items.length === 0) return;

      this.showConfirmModal(
        `Clear videos from "${activeList.name}"?`,
        `This will remove all ${activeList.items.length} videos from this list.`,
        'Clear Videos',
        async () => {
          activeList.items = [];
          activeList.lastActiveIndex = 0;
          const store = await this.storage.load();
          store.items = [];
          store.lastActiveIndex = 0;
          await this.storage.save(store);
          await this.refreshState();
          this.callbacks.onPlaylistUpdated([], 0);
          this.callbacks.onToast(`Cleared "${activeList.name}"`);
        }
      );
    });
  }

  private renderPlaylistTabs(): void {
    const tabsContainer = this.drawerElement.querySelector('#playlist-tabs-container') as HTMLElement;
    tabsContainer.innerHTML = '';

    const canDelete = this.currentLists.length > 1;

    this.currentLists.forEach((list) => {
      const isActive = list.id === this.activeListId;
      const tabEl = document.createElement('div');
      tabEl.className = `tab-pill ${isActive ? 'active' : ''}`;
      tabEl.setAttribute('data-id', list.id);

      tabEl.innerHTML = `
        <span class="tab-pill-name">${list.name}</span>
        <span class="tab-pill-count">${list.items.length}</span>
        ${
          isActive && canDelete
            ? `<button type="button" class="tab-pill-delete" title="Delete list '${list.name}'" aria-label="Delete list">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>`
            : ''
        }
      `;

      // Switch list click
      tabEl.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.tab-pill-delete')) return;
        if (this.activeListId === list.id) return;

        try {
          const switched = await this.storage.switchList(list.id);
          this.activeListId = switched.id;
          await this.refreshState();
          this.callbacks.onPlaylistUpdated(switched.items, switched.lastActiveIndex);
          this.callbacks.onToast(`Switched to "${switched.name}"`);
        } catch (err) {
          this.callbacks.onToast(err instanceof Error ? err.message : 'Failed to switch list');
        }
      });

      // Delete list click
      if (isActive && canDelete) {
        tabEl.querySelector('.tab-pill-delete')?.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showConfirmModal(
            `Delete list "${list.name}"?`,
            `Are you sure? This will remove the list and all its ${list.items.length} videos.`,
            'Delete List',
            async () => {
              try {
                const nextActive = await this.storage.deleteList(list.id);
                this.activeListId = nextActive.id;
                await this.refreshState();
                this.callbacks.onPlaylistUpdated(nextActive.items, nextActive.lastActiveIndex);
                this.callbacks.onToast(`Deleted "${list.name}"`);
              } catch (err) {
                this.callbacks.onToast(err instanceof Error ? err.message : 'Failed to delete list');
              }
            }
          );
        });
      }

      tabsContainer.appendChild(tabEl);
    });
  }

  // --- Cool Video Input Experience ---

  private setupVideoInput(): void {
    const input = this.drawerElement.querySelector('#add-video-input') as HTMLInputElement;
    const clearBtn = this.drawerElement.querySelector('#btn-clear-input') as HTMLButtonElement;
    const pasteBtn = this.drawerElement.querySelector('#btn-paste-clipboard') as HTMLButtonElement;
    const errorDisplay = this.drawerElement.querySelector('#add-video-error') as HTMLElement;

    const previewCard = this.drawerElement.querySelector('#video-live-preview') as HTMLElement;
    const previewAddBtn = this.drawerElement.querySelector('#btn-preview-add') as HTMLButtonElement;
    const previewPlayBtn = this.drawerElement.querySelector('#btn-preview-play') as HTMLButtonElement;

    const batchBox = this.drawerElement.querySelector('#batch-preview-box') as HTMLElement;
    const batchAddBtn = this.drawerElement.querySelector('#btn-batch-add') as HTMLButtonElement;

    // Clear input
    clearBtn.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      errorDisplay.style.display = 'none';
      previewCard.style.display = 'none';
      batchBox.style.display = 'none';
      input.focus();
    });

    // Clipboard Paste Button
    pasteBtn.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && text.trim()) {
            input.value = text.trim();
            clearBtn.style.display = 'block';
            this.handleInputChange(input.value);
            this.callbacks.onToast('Pasted from clipboard!');
            return;
          }
        }
      } catch {
        // Clipboard access denied or unsupported
      }
      input.focus();
    });

    // Real-time detection as user types or pastes
    input.addEventListener('input', () => {
      clearBtn.style.display = input.value.trim() ? 'block' : 'none';
      if (this.debounceTimer) window.clearTimeout(this.debounceTimer);
      this.debounceTimer = window.setTimeout(() => {
        this.handleInputChange(input.value);
      }, 180);
    });

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const batchIds = extractAllVideoIds(input.value);
        if (batchIds.length > 1) {
          await this.addBatchVideos(batchIds);
        } else if (this.activePreviewId) {
          await this.addSingleVideo(this.activePreviewId, this.activePreviewTitle, false);
        } else {
          const parsed = parseVideoInput(input.value);
          if (parsed.valid && parsed.videoId) {
            await this.addSingleVideo(parsed.videoId, null, false);
          } else {
            errorDisplay.textContent = parsed.errorMessage || 'Invalid video link';
            errorDisplay.style.display = 'block';
          }
        }
      }
    });

    // Preview Add Button
    previewAddBtn.addEventListener('click', async () => {
      if (!this.activePreviewId) return;
      await this.addSingleVideo(this.activePreviewId, this.activePreviewTitle, false);
    });

    // Preview Play Button
    previewPlayBtn.addEventListener('click', async () => {
      if (!this.activePreviewId) return;
      await this.addSingleVideo(this.activePreviewId, this.activePreviewTitle, true);
    });

    // Batch Add Button
    batchAddBtn.addEventListener('click', async () => {
      const batchIds = extractAllVideoIds(input.value);
      await this.addBatchVideos(batchIds);
    });

    // Quick presets
    const sample5Btn = this.drawerElement.querySelector('#btn-sample-5') as HTMLButtonElement;
    sample5Btn.addEventListener('click', async () => {
      await this.addSampleBatch(SAMPLE_BATCH_SHORTS.slice(0, 5));
    });

    const sampleAllBtn = this.drawerElement.querySelector('#btn-sample-all') as HTMLButtonElement;
    sampleAllBtn.addEventListener('click', async () => {
      await this.addSampleBatch(SAMPLE_BATCH_SHORTS);
    });
  }

  private async handleInputChange(val: string): Promise<void> {
    const errorDisplay = this.drawerElement.querySelector('#add-video-error') as HTMLElement;
    const previewCard = this.drawerElement.querySelector('#video-live-preview') as HTMLElement;
    const previewThumb = this.drawerElement.querySelector('#preview-thumb-img') as HTMLImageElement;
    const previewBadge = this.drawerElement.querySelector('#preview-format-badge') as HTMLElement;
    const previewTitle = this.drawerElement.querySelector('#preview-title') as HTMLElement;
    const batchBox = this.drawerElement.querySelector('#batch-preview-box') as HTMLElement;
    const batchCountText = this.drawerElement.querySelector('#batch-count-text') as HTMLElement;

    errorDisplay.style.display = 'none';

    const trimmed = val.trim();
    if (!trimmed) {
      previewCard.style.display = 'none';
      batchBox.style.display = 'none';
      this.activePreviewId = null;
      this.activePreviewTitle = null;
      return;
    }

    const batchIds = extractAllVideoIds(trimmed);

    if (batchIds.length > 1) {
      // Multiple videos detected! Show batch box
      previewCard.style.display = 'none';
      batchBox.style.display = 'flex';
      batchCountText.textContent = `${batchIds.length} YouTube videos detected`;
      return;
    }

    // Single video parsed
    batchBox.style.display = 'none';
    const parsed = parseVideoInput(trimmed);
    if (parsed.valid && parsed.videoId) {
      const videoId = parsed.videoId;
      this.activePreviewId = videoId;
      previewCard.style.display = 'flex';
      previewThumb.src = getYoutubeThumbnail(videoId, 'mq');
      previewBadge.textContent = parsed.inputFormat === 'shorts' ? 'Shorts ⚡' : 'YouTube 🎬';
      previewTitle.textContent = 'Loading video title...';

      const title = await fetchVideoTitle(videoId);
      if (this.activePreviewId === videoId) {
        this.activePreviewTitle = title;
        previewTitle.textContent = title;
      }
    } else {
      previewCard.style.display = 'none';
      this.activePreviewId = null;
      this.activePreviewTitle = null;
    }
  }

  private async addSingleVideo(videoId: string, preloadedTitle: string | null, playImmediately: boolean): Promise<void> {
    const input = this.drawerElement.querySelector('#add-video-input') as HTMLInputElement;
    const clearBtn = this.drawerElement.querySelector('#btn-clear-input') as HTMLButtonElement;
    const errorDisplay = this.drawerElement.querySelector('#add-video-error') as HTMLElement;
    const previewCard = this.drawerElement.querySelector('#video-live-preview') as HTMLElement;

    try {
      const title = preloadedTitle || (await fetchVideoTitle(videoId));
      await this.storage.addItem({
        id: videoId,
        addedAt: Date.now(),
        title
      });

      input.value = '';
      clearBtn.style.display = 'none';
      previewCard.style.display = 'none';
      errorDisplay.style.display = 'none';
      this.activePreviewId = null;
      this.activePreviewTitle = null;

      await this.refreshState();
      const store = await this.storage.load();
      const newIndex = store.items.length - 1;

      this.callbacks.onPlaylistUpdated(store.items, playImmediately ? newIndex : store.lastActiveIndex);

      if (playImmediately) {
        this.callbacks.onSelectVideo(newIndex);
        this.close();
        this.callbacks.onToast(`Now playing: ${title}`);
      } else {
        this.callbacks.onToast(`Added: ${title}`);
      }
    } catch (err) {
      const store = await this.storage.load();
      const existingIndex = store.items.findIndex((item) => item.id === videoId);
      if (existingIndex !== -1) {
        errorDisplay.innerHTML = `
          <span>This video is already in this playlist.</span>
          <button type="button" class="jump-video-btn" style="background: none; border: none; color: #fff; text-decoration: underline; cursor: pointer; font-size: 13px; margin-left: 6px;">Jump to it</button>
        `;
        errorDisplay.querySelector('.jump-video-btn')?.addEventListener('click', () => {
          this.callbacks.onSelectVideo(existingIndex);
          this.close();
        });
      } else {
        errorDisplay.textContent = err instanceof Error ? err.message : 'Failed to add video';
      }
      errorDisplay.style.display = 'block';
    }
  }

  private async addBatchVideos(videoIds: string[]): Promise<void> {
    const input = this.drawerElement.querySelector('#add-video-input') as HTMLInputElement;
    const clearBtn = this.drawerElement.querySelector('#btn-clear-input') as HTMLButtonElement;
    const batchBox = this.drawerElement.querySelector('#batch-preview-box') as HTMLElement;

    let addedCount = 0;
    let skippedCount = 0;

    for (const id of videoIds) {
      try {
        const title = await fetchVideoTitle(id);
        await this.storage.addItem({
          id,
          addedAt: Date.now(),
          title
        });
        addedCount++;
      } catch {
        skippedCount++;
      }
    }

    input.value = '';
    clearBtn.style.display = 'none';
    batchBox.style.display = 'none';

    await this.refreshState();
    const store = await this.storage.load();
    this.callbacks.onPlaylistUpdated(store.items);

    if (addedCount > 0) {
      this.callbacks.onToast(`Added ${addedCount} videos! (${skippedCount} duplicates skipped)`);
    } else {
      this.callbacks.onToast('All detected videos are already in this playlist');
    }
  }

  private async addSampleBatch(samples: VideoEntry[]): Promise<void> {
    let addedCount = 0;
    for (const item of samples) {
      try {
        await this.storage.addItem({
          id: item.id,
          addedAt: Date.now(),
          title: item.title
        });
        addedCount++;
      } catch {}
    }

    await this.refreshState();
    const store = await this.storage.load();
    this.callbacks.onPlaylistUpdated(store.items);
    this.callbacks.onToast(`Added ${addedCount} sample videos to list!`);
  }

  // --- Render Video Items List ---

  private renderList(items: VideoEntry[], activeIndex = 0): void {
    const listUl = this.drawerElement.querySelector('#playlist-items-ul') as HTMLUListElement;
    const clearBtn = this.drawerElement.querySelector('#btn-clear-current-list') as HTMLElement;
    const itemsSummary = this.drawerElement.querySelector('#current-list-items-summary') as HTMLElement;
    const totalCountBadge = this.drawerElement.querySelector('#drawer-total-count') as HTMLElement;

    listUl.innerHTML = '';
    totalCountBadge.textContent = `${items.length} ${items.length === 1 ? 'video' : 'videos'}`;
    itemsSummary.textContent = `${items.length} ${items.length === 1 ? 'video' : 'videos'} in this playlist`;

    if (items.length === 0) {
      clearBtn.style.display = 'none';
      listUl.innerHTML = `
        <li class="empty-list-card">
          <div style="font-size: 28px; margin-bottom: 6px;">🎬</div>
          <p style="font-weight: 600; color: #eee; font-size: 14px;">This playlist is empty</p>
          <p style="color: #888; font-size: 13px; margin-top: 4px;">Paste YouTube links above or click "+ 5 Sample Shorts" to test!</p>
        </li>
      `;
      return;
    }

    clearBtn.style.display = 'block';

    items.forEach((item, index) => {
      const isCurrentPlaying = index === activeIndex;
      const li = document.createElement('li');
      li.className = `playlist-item ${isCurrentPlaying ? 'active' : ''}`;
      li.setAttribute('data-index', String(index));

      li.innerHTML = `
        <div class="playlist-item-left">
          <strong class="item-index">#${index + 1}</strong>
          <div class="item-thumb-wrapper">
            <img class="item-thumb" src="${getYoutubeThumbnail(item.id, 'default')}" alt="${item.id}" loading="lazy" />
            ${isCurrentPlaying ? '<span class="playing-pulse-indicator"></span>' : ''}
          </div>
          <div class="playlist-item-meta">
            <span class="playlist-item-title">${item.title || `Short (${item.id})`}</span>
            <span class="playlist-item-sub">ID: ${item.id}</span>
          </div>
        </div>
        <div class="playlist-item-actions">
          ${isCurrentPlaying ? '<span class="badge-now-playing">PLAYING</span>' : ''}
          <button class="item-delete-btn" aria-label="Delete video" data-id="${item.id}" title="Remove video">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      li.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.item-delete-btn')) return;
        this.callbacks.onSelectVideo(index);
        this.close();
      });

      li.querySelector('.item-delete-btn')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.storage.removeItem(item.id);
        await this.refreshState();
        const updated = await this.storage.load();
        this.callbacks.onPlaylistUpdated(updated.items, updated.lastActiveIndex);
        this.callbacks.onToast('Video removed');
      });

      listUl.appendChild(li);
    });
  }

  private async refreshState(): Promise<void> {
    const store = await this.storage.load();
    this.currentLists = store.lists;
    this.activeListId = store.activeListId;
    this.renderPlaylistTabs();
    this.renderList(store.items, store.lastActiveIndex);
  }

  // --- Backup & Restore (All Playlists & Content) ---

  private setupBackupActions(): void {
    const backupHeaderBtn = this.drawerElement.querySelector('#btn-drawer-backup') as HTMLElement;
    const backupAllBtn = this.drawerElement.querySelector('#btn-backup-all') as HTMLElement;
    const restoreAllBtn = this.drawerElement.querySelector('#btn-restore-all') as HTMLElement;
    const fileInput = this.drawerElement.querySelector('.file-input') as HTMLInputElement;

    backupHeaderBtn?.addEventListener('click', () => {
      this.showBackupRestoreModal();
    });

    backupAllBtn?.addEventListener('click', () => {
      this.downloadFullBackup();
    });

    restoreAllBtn?.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput?.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        fileInput.value = '';
        await this.handleImportContent(content);
      };
      reader.readAsText(file);
    });
  }

  private downloadFullBackup(): void {
    const json = this.storage.exportJSON();
    triggerDownload(json, `focusscroll-all-playlists-${new Date().toISOString().slice(0, 10)}.json`);
    this.callbacks.onToast('Complete backup downloaded (all playlists & video links)');
  }

  private async handleImportContent(jsonString: string): Promise<void> {
    try {
      const parsed = JSON.parse(jsonString);
      const isUnified = Array.isArray(parsed.lists) && parsed.lists.length > 0;
      const totalVideosInFile = isUnified
        ? parsed.lists.reduce((acc: number, l: any) => acc + (Array.isArray(l.items) ? l.items.length : 0), 0)
        : Array.isArray(parsed.playlist)
        ? parsed.playlist.length
        : 0;

      const store = await this.storage.load();
      const currentVideoCount = store.lists.reduce((acc, l) => acc + l.items.length, 0);

      if (currentVideoCount === 0) {
        const res = await this.storage.importJSON(jsonString, 'replace');
        await this.finishImport(res);
        return;
      }

      const modalTitle = isUnified ? 'Restore All Playlists' : 'Import Playlist';
      const modalMessage = isUnified
        ? `This backup contains ${parsed.lists.length} playlist(s) with ${totalVideosInFile} total video(s). Would you like to merge them with your current playlists, or replace all current playlists?`
        : `Your current playlist has videos. Would you like to replace the entire list or merge the new items?`;

      this.showImportChoiceModal(modalTitle, modalMessage, async (choice) => {
        const res = await this.storage.importJSON(jsonString, choice);
        await this.finishImport(res);
      });
    } catch {
      this.callbacks.onToast('Failed to parse backup file');
    }
  }

  private showImportChoiceModal(
    title: string,
    message: string,
    onChoice: (choice: 'replace' | 'merge') => void
  ): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h3 style="font-size: 17px; font-weight: 600;">${title}</h3>
        <p style="font-size: 14px; color: #888; line-height: 1.45; margin-top: 6px;">
          ${message}
        </p>
        <div class="modal-actions">
          <button class="btn-secondary cancel-btn">Cancel</button>
          <button class="btn-secondary merge-btn">Merge</button>
          <button class="btn-primary replace-btn">Replace All</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.cancel-btn')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('.merge-btn')?.addEventListener('click', () => {
      document.body.removeChild(modal);
      onChoice('merge');
    });

    modal.querySelector('.replace-btn')?.addEventListener('click', () => {
      document.body.removeChild(modal);
      onChoice('replace');
    });
  }

  private showConfirmModal(title: string, message: string, confirmLabel: string, onConfirm: () => Promise<void>): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h3 style="font-size: 17px; font-weight: 600;">${title}</h3>
        <p style="font-size: 14px; color: #aaa; line-height: 1.4;">${message}</p>
        <div class="modal-actions">
          <button class="btn-secondary cancel-btn">Cancel</button>
          <button class="btn-primary confirm-btn" style="background: #ef4444; color: #fff;">${confirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.cancel-btn')?.addEventListener('click', () => {
      document.body.removeChild(modal);
    });

    modal.querySelector('.confirm-btn')?.addEventListener('click', async () => {
      document.body.removeChild(modal);
      await onConfirm();
    });
  }

  private async finishImport(res: { success: boolean; importedCount: number; skippedCount: number; error?: string }): Promise<void> {
    if (res.success) {
      await this.refreshState();
      const store = await this.storage.load();
      this.callbacks.onPlaylistUpdated(store.items);
      this.callbacks.onToast(`Restored backup! (${res.importedCount} videos, ${res.skippedCount} skipped)`);
    } else {
      this.callbacks.onToast(res.error || 'Import failed');
    }
  }

  public async showBackupRestoreModal(): Promise<void> {
    const store = await this.storage.load();
    const lists = store.lists || [];
    const totalVideos = (await this.storage.getConsolidatedVideos()).length;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="backup-modal-content">
        <div class="version-modal-header">
          <div class="version-modal-title-group">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span class="version-modal-title">Backup & Restore Playlists</span>
          </div>
          <button type="button" class="close-backup-modal-btn" style="font-size: 18px; color: #888; background: none; border: none; cursor: pointer; padding: 4px;">✕</button>
        </div>

        <div class="backup-modal-body">
          <div class="backup-info-card">
            <div style="font-weight: 600; font-size: 14px; color: #fff;">Unified Playlists Safeguard</div>
            <div style="font-size: 12px; color: #888; margin-top: 4px; line-height: 1.45;">
              Back up all your custom playlists, video links, titles, and ordering into a single portable file.
            </div>
            <div class="backup-stat-row">
              <span class="backup-stat-chip">📁 ${lists.length} playlist${lists.length === 1 ? '' : 's'}</span>
              <span class="backup-stat-chip">🎬 ${totalVideos} total short${totalVideos === 1 ? '' : 's'}</span>
            </div>
          </div>

          <!-- Download Action -->
          <div class="backup-action-card">
            <div>
              <div style="font-weight: 600; font-size: 13px; color: #fff;">1. Download Complete Backup</div>
              <div style="font-size: 11px; color: #888; margin-top: 2px;">Exports all playlists and video URLs to JSON</div>
            </div>
            <button type="button" class="btn-primary" id="btn-modal-do-backup" style="margin-top: 8px; width: 100%; justify-content: center; display: flex; align-items: center; gap: 8px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Download Backup JSON</span>
            </button>
          </div>

          <!-- Restore Action -->
          <div class="backup-action-card">
            <div>
              <div style="font-weight: 600; font-size: 13px; color: #fff;">2. Restore from File</div>
              <div style="font-size: 11px; color: #888; margin-top: 2px;">Import a backup to restore all playlists (replace or merge)</div>
            </div>
            <button type="button" class="btn-secondary" id="btn-modal-do-restore" style="margin-top: 8px; width: 100%; justify-content: center; display: flex; align-items: center; gap: 8px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>Choose Backup File to Restore...</span>
            </button>
            <input type="file" id="modal-backup-file-input" accept=".json" style="display: none;" />
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    };

    modal.querySelector('.close-backup-modal-btn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector('#btn-modal-do-backup')?.addEventListener('click', () => {
      this.downloadFullBackup();
    });

    const modalFileInput = modal.querySelector('#modal-backup-file-input') as HTMLInputElement;
    modal.querySelector('#btn-modal-do-restore')?.addEventListener('click', () => {
      modalFileInput.click();
    });

    modalFileInput?.addEventListener('change', () => {
      const file = modalFileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        closeModal();
        await this.handleImportContent(content);
      };
      reader.readAsText(file);
    });
  }

  openBackupRestore(): void {
    this.showBackupRestoreModal();
  }

  private setupVersionControl(): void {
    const btn = this.drawerElement.querySelector('#btn-open-version-modal');
    btn?.addEventListener('click', () => {
      this.showVersionControlModal();
    });
  }

  private async showVersionControlModal(): Promise<void> {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="version-modal-content">
        <div class="version-modal-header">
          <div class="version-modal-title-group">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 3v6m0 6v6M3 12h6m6 0h6"></path>
            </svg>
            <span class="version-modal-title">Version Control & Snapshots</span>
          </div>
          <button type="button" class="close-version-modal-btn" style="font-size: 18px; color: #888; background: none; border: none; cursor: pointer; padding: 4px;">✕</button>
        </div>

        <div class="version-modal-body">
          <!-- App Version info -->
          <div class="version-app-info-card">
            <div>
              <div style="font-weight: 600; font-size: 13px; color: #fff;">FocusScroll v${APP_VERSION}</div>
              <div style="font-size: 11px; color: #888; margin-top: 2px;">Offline PWA • Cloudflare Edge Build</div>
            </div>
            <button type="button" class="btn-secondary btn-sm" id="btn-check-updates" style="font-size: 11px;">Check for Updates</button>
          </div>

          <!-- Create Checkpoint -->
          <div class="version-create-box">
            <div style="font-weight: 600; font-size: 12px; color: #ccc;">Create Snapshot Checkpoint</div>
            <input
              type="text"
              class="input-field"
              id="version-tag-input"
              placeholder="Tag (e.g., v1.1, Gym Playlist, Pre-Clean)..."
              style="padding: 8px 10px; font-size: 12px;"
              maxlength="40"
            />
            <input
              type="text"
              class="input-field"
              id="version-desc-input"
              placeholder="Optional notes or description..."
              style="padding: 8px 10px; font-size: 12px;"
              maxlength="80"
            />
            <button type="button" class="btn-primary btn-sm" id="btn-create-checkpoint" style="align-self: flex-end; margin-top: 4px;">
              + Save Checkpoint
            </button>
          </div>

          <!-- Version History -->
          <div>
            <div style="font-weight: 600; font-size: 12px; color: #888; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
              Snapshot History & Rollbacks
            </div>
            <div class="version-history-list" id="version-history-container">
              <div style="color: #666; font-size: 12px; text-align: center; padding: 12px;">Loading versions...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      if (document.body.contains(modal)) {
        document.body.removeChild(modal);
      }
    };

    modal.querySelector('.close-version-modal-btn')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Check updates button
    modal.querySelector('#btn-check-updates')?.addEventListener('click', async () => {
      const updateBtn = modal.querySelector('#btn-check-updates') as HTMLButtonElement;
      updateBtn.disabled = true;
      updateBtn.textContent = 'Checking...';
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
          }
        }
        this.callbacks.onToast(`You are running the latest version (v${APP_VERSION})`);
      } catch {
        this.callbacks.onToast('Version check complete');
      } finally {
        updateBtn.disabled = false;
        updateBtn.textContent = 'Check for Updates';
      }
    });

    const tagInput = modal.querySelector('#version-tag-input') as HTMLInputElement;
    const descInput = modal.querySelector('#version-desc-input') as HTMLInputElement;
    const createBtn = modal.querySelector('#btn-create-checkpoint') as HTMLButtonElement;
    const historyContainer = modal.querySelector('#version-history-container') as HTMLElement;

    const renderList = async () => {
      const versions = await this.storage.getVersions();
      historyContainer.innerHTML = '';

      if (versions.length === 0) {
        historyContainer.innerHTML = '<div style="color: #666; font-size: 12px; text-align: center; padding: 12px;">No saved versions yet.</div>';
        return;
      }

      versions.forEach((v) => {
        const card = document.createElement('div');
        card.className = 'version-item-card';

        const timeStr = new Date(v.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        card.innerHTML = `
          <div class="version-item-header">
            <span class="version-item-tag">${v.tag}</span>
            <span class="version-item-time">${timeStr}</span>
          </div>
          ${v.description ? `<div style="font-size: 12px; color: #ddd;">${v.description}</div>` : ''}
          <div class="version-item-summary">
            ${v.summary.totalLists} list${v.summary.totalLists === 1 ? '' : 's'} • ${v.summary.totalVideos} video${v.summary.totalVideos === 1 ? '' : 's'} • Active: <span style="color: #fff;">${v.summary.activeListName}</span>
          </div>
          <div class="version-item-actions">
            <button type="button" class="btn-restore-version" data-id="${v.id}">Restore</button>
            <button type="button" class="btn-export-version" data-id="${v.id}">Export</button>
            <button type="button" class="btn-delete-version" data-id="${v.id}">Delete</button>
          </div>
        `;

        // Restore button
        card.querySelector('.btn-restore-version')?.addEventListener('click', () => {
          this.showConfirmModal(
            `Restore "${v.tag}"?`,
            `This will roll back your current playlists and videos to this checkpoint (${v.summary.totalVideos} videos across ${v.summary.totalLists} lists).`,
            'Restore Version',
            async () => {
              try {
                const restoredStore = await this.storage.restoreVersion(v.id);
                closeModal();
                await this.refreshState();
                this.callbacks.onPlaylistUpdated(restoredStore.items, restoredStore.lastActiveIndex);
                this.callbacks.onToast(`Restored version "${v.tag}"`);
              } catch (err) {
                this.callbacks.onToast(err instanceof Error ? err.message : 'Restore failed');
              }
            }
          );
        });

        // Export button
        card.querySelector('.btn-export-version')?.addEventListener('click', () => {
          const json = JSON.stringify(v.data, null, 2);
          const safeTag = v.tag.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
          triggerDownload(json, `focus-scroll-version-${safeTag}.json`);
          this.callbacks.onToast(`Exported version "${v.tag}"`);
        });

        // Delete button
        card.querySelector('.btn-delete-version')?.addEventListener('click', () => {
          this.showConfirmModal(
            `Delete version "${v.tag}"?`,
            'Are you sure? This checkpoint will be removed from your snapshot history.',
            'Delete Snapshot',
            async () => {
              await this.storage.deleteVersion(v.id);
              await renderList();
              this.callbacks.onToast(`Deleted "${v.tag}"`);
            }
          );
        });

        historyContainer.appendChild(card);
      });
    };

    createBtn.addEventListener('click', async () => {
      const tag = tagInput.value.trim();
      const desc = descInput.value.trim();
      createBtn.disabled = true;

      try {
        const created = await this.storage.createVersion(tag, desc);
        tagInput.value = '';
        descInput.value = '';
        await renderList();
        this.callbacks.onToast(`Saved checkpoint "${created.tag}"`);
      } catch (err) {
        this.callbacks.onToast(err instanceof Error ? err.message : 'Failed to create checkpoint');
      } finally {
        createBtn.disabled = false;
      }
    });

    await renderList();
  }

  openVersionControl(): void {
    this.showVersionControlModal();
  }

  async open(): Promise<void> {
    await this.refreshState();
    this.backdropElement.classList.add('open');
    this.drawerElement.classList.add('open');
  }

  close(): void {
    this.backdropElement.classList.remove('open');
    this.drawerElement.classList.remove('open');
    this.callbacks.onClose?.();
  }
}
