import { StorageManager } from '../storage/db';
import { triggerDownload } from '../storage/backup';
import { parseVideoInput } from '../utils/url-parser';
import { VideoEntry } from '../types/storage';

export interface DrawerCallbacks {
  onPlaylistUpdated: (items: VideoEntry[]) => void;
  onToast: (msg: string) => void;
}

export class PlaylistDrawer {
  private backdropElement: HTMLElement;
  private drawerElement: HTMLElement;
  private storage: StorageManager;
  private callbacks: DrawerCallbacks;
  

  constructor(storage: StorageManager, callbacks: DrawerCallbacks) {
    this.storage = storage;
    this.callbacks = callbacks;

    this.backdropElement = document.createElement('div');
    this.backdropElement.className = 'drawer-backdrop';

    this.drawerElement = document.createElement('div');
    this.drawerElement.className = 'drawer';

    this.drawerElement.innerHTML = `
      <div class="drawer-header">
        <span class="drawer-title">Curated Playlist</span>
        <button class="drawer-close" aria-label="Close drawer">✕</button>
      </div>
      <div class="drawer-body">
        <form class="add-video-form">
          <input
            type="text"
            class="input-field"
            placeholder="Paste YouTube Short URL or ID"
            aria-label="Video link or ID"
          />
          <button type="submit" class="btn-primary">Add</button>
        </form>
        <div class="input-error" style="color: #ff6b6b; font-size: 13px; display: none;"></div>

        <div style="display: flex; gap: 8px;">
          <button class="btn-secondary export-btn" style="flex: 1;">Export JSON</button>
          <button class="btn-secondary import-btn" style="flex: 1;">Import JSON</button>
          <input type="file" class="file-input" accept=".json" style="display: none;" />
        </div>

        <ul class="playlist-list"></ul>
      </div>
    `;

    this.backdropElement.addEventListener('click', () => this.close());
    this.drawerElement.querySelector('.drawer-close')?.addEventListener('click', () => this.close());

    this.setupForm();
    this.setupBackupActions();
  }

  getElements(): { backdrop: HTMLElement; drawer: HTMLElement } {
    return {
      backdrop: this.backdropElement,
      drawer: this.drawerElement
    };
  }

  private setupForm(): void {
    const form = this.drawerElement.querySelector('.add-video-form') as HTMLFormElement;
    const input = this.drawerElement.querySelector('.input-field') as HTMLInputElement;
    const errorDisplay = this.drawerElement.querySelector('.input-error') as HTMLElement;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorDisplay.style.display = 'none';

      const parsed = parseVideoInput(input.value);
      if (!parsed.valid || !parsed.videoId) {
        errorDisplay.textContent = parsed.errorMessage || 'Invalid video link';
        errorDisplay.style.display = 'block';
        return;
      }

      try {
        await this.storage.addItem({
          id: parsed.videoId,
          addedAt: Date.now(),
          title: `Short (${parsed.videoId})`
        });
        input.value = '';
        const store = await this.storage.load();
        this.renderList(store.items, store.lastActiveIndex);
        this.callbacks.onPlaylistUpdated(store.items);
        this.callbacks.onToast('Video added to playlist');
      } catch (err) {
        errorDisplay.textContent = err instanceof Error ? err.message : 'Failed to add';
        errorDisplay.style.display = 'block';
      }
    });
  }

  private setupBackupActions(): void {
    const exportBtn = this.drawerElement.querySelector('.export-btn') as HTMLElement;
    const importBtn = this.drawerElement.querySelector('.import-btn') as HTMLElement;
    const fileInput = this.drawerElement.querySelector('.file-input') as HTMLInputElement;

    exportBtn.addEventListener('click', () => {
      const json = this.storage.exportJSON();
      triggerDownload(json, `focusscroll-playlist-${new Date().toISOString().slice(0, 10)}.json`);
      this.callbacks.onToast('Playlist exported');
    });

    importBtn.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', async () => {
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

  private async handleImportContent(jsonString: string): Promise<void> {
    const store = await this.storage.load();
    if (store.items.length === 0) {
      // Direct replace if empty
      const res = await this.storage.importJSON(jsonString, 'replace');
      this.finishImport(res);
      return;
    }

    // Prompt user: Replace vs Merge (Clarification Q4)
    this.showImportChoiceModal(async (choice) => {
      const res = await this.storage.importJSON(jsonString, choice);
      this.finishImport(res);
    });
  }

  private showImportChoiceModal(onChoice: (choice: 'replace' | 'merge') => void): void {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h3 style="font-size: 17px; font-weight: 600;">Import Playlist</h3>
        <p style="font-size: 14px; color: #888;">
          Your playlist currently has videos. Would you like to replace the entire list or merge the new items?
        </p>
        <div class="modal-actions">
          <button class="btn-secondary cancel-btn">Cancel</button>
          <button class="btn-secondary merge-btn">Merge</button>
          <button class="btn-primary replace-btn">Replace</button>
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

  private async finishImport(res: { success: boolean; importedCount: number; skippedCount: number; error?: string }): Promise<void> {
    if (res.success) {
      const store = await this.storage.load();
      this.renderList(store.items, store.lastActiveIndex);
      this.callbacks.onPlaylistUpdated(store.items);
      this.callbacks.onToast(`Imported ${res.importedCount} videos (${res.skippedCount} skipped)`);
    } else {
      this.callbacks.onToast(res.error || 'Import failed');
    }
  }

  private renderList(items: VideoEntry[], activeIndex = 0): void {
    const list = this.drawerElement.querySelector('.playlist-list') as HTMLUListElement;
    list.innerHTML = '';

    if (items.length === 0) {
      list.innerHTML = `<li style="color: #666; font-size: 13px; text-align: center; padding: 16px;">Playlist is empty</li>`;
      return;
    }

    items.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = `playlist-item ${index === activeIndex ? 'active' : ''}`;
      li.innerHTML = `
        <span style="display: flex; align-items: center; gap: 8px;">
          <strong style="color: #888; font-size: 12px; width: 20px;">#${index + 1}</strong>
          <span>${item.title || item.id}</span>
        </span>
        <button class="item-delete-btn" aria-label="Delete video" data-id="${item.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      `;

      li.querySelector('.item-delete-btn')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await this.storage.removeItem(item.id);
        const updated = await this.storage.load();
        this.renderList(updated.items, updated.lastActiveIndex);
        this.callbacks.onPlaylistUpdated(updated.items);
        this.callbacks.onToast('Video removed');
      });

      list.appendChild(li);
    });
  }

  async open(): Promise<void> {
    const store = await this.storage.load();
    this.renderList(store.items, store.lastActiveIndex);
    this.backdropElement.classList.add('open');
    this.drawerElement.classList.add('open');
    
  }

  close(): void {
    this.backdropElement.classList.remove('open');
    this.drawerElement.classList.remove('open');
    
  }
}
