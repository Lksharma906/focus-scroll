import { get, set, del } from 'idb-keyval';
import { IStorageManager, PlaylistStore, VideoEntry, ImportResult } from '../types/storage';

const STORAGE_KEY = 'focus_scroll_playlist_v1';

export class StorageManager implements IStorageManager {
  private memoryCache: PlaylistStore | null = null;

  private getDefaultStore(): PlaylistStore {
    return {
      version: 1,
      items: [],
      lastActiveIndex: 0,
      updatedAt: Date.now()
    };
  }

  async load(): Promise<PlaylistStore> {
    if (this.memoryCache) {
      return this.memoryCache;
    }

    try {
      const data = await get<PlaylistStore>(STORAGE_KEY);
      if (data && Array.isArray(data.items)) {
        this.memoryCache = data;
        return data;
      }
    } catch {
      // Fallback to localStorage
    }

    try {
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData) as PlaylistStore;
        if (parsed && Array.isArray(parsed.items)) {
          this.memoryCache = parsed;
          return parsed;
        }
      }
    } catch {
      // Storage unavailable or empty
    }

    const defaultStore = this.getDefaultStore();
    this.memoryCache = defaultStore;
    return defaultStore;
  }

  async save(store: PlaylistStore): Promise<void> {
    store.updatedAt = Date.now();
    this.memoryCache = store;

    try {
      await set(STORAGE_KEY, store);
    } catch {
      // Fallback
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // LocalStorage full or blocked
    }
  }

  async addItem(entry: VideoEntry): Promise<void> {
    const store = await this.load();
    const exists = store.items.some((item) => item.id === entry.id);
    if (exists) {
      throw new Error('This video is already in your list');
    }
    store.items.push(entry);
    await this.save(store);
  }

  async removeItem(videoId: string): Promise<void> {
    const store = await this.load();
    const index = store.items.findIndex((item) => item.id === videoId);
    if (index !== -1) {
      store.items.splice(index, 1);
      if (store.lastActiveIndex >= store.items.length && store.items.length > 0) {
        store.lastActiveIndex = store.items.length - 1;
      } else if (store.items.length === 0) {
        store.lastActiveIndex = 0;
      }
      await this.save(store);
    }
  }

  async reorder(fromIndex: number, toIndex: number): Promise<void> {
    const store = await this.load();
    if (
      fromIndex < 0 ||
      fromIndex >= store.items.length ||
      toIndex < 0 ||
      toIndex >= store.items.length
    ) {
      return;
    }
    const [moved] = store.items.splice(fromIndex, 1);
    store.items.splice(toIndex, 0, moved);
    await this.save(store);
  }

  async saveActiveIndex(index: number): Promise<void> {
    const store = await this.load();
    if (index >= 0 && index < store.items.length) {
      store.lastActiveIndex = index;
      await this.save(store);
    }
  }

  exportJSON(): string {
    const store = this.memoryCache || this.getDefaultStore();
    const payload = {
      schema: '1.0.0',
      exportedAt: new Date().toISOString(),
      playlist: store.items
    };
    return JSON.stringify(payload, null, 2);
  }

  async importJSON(rawJson: string, mode: 'replace' | 'merge' = 'replace'): Promise<ImportResult> {
    try {
      const parsed = JSON.parse(rawJson);
      if (!parsed || !parsed.schema || !Array.isArray(parsed.playlist)) {
        return {
          success: false,
          importedCount: 0,
          skippedCount: 0,
          error: 'Invalid file format: Missing schema or playlist array.'
        };
      }

      const major = parsed.schema.split('.')[0];
      if (major !== '1') {
        return {
          success: false,
          importedCount: 0,
          skippedCount: 0,
          error: `Unsupported schema major version ${major}. Only schema v1.x is supported.`
        };
      }

      const store = await this.load();
      let importedCount = 0;
      let skippedCount = 0;
      const validItems: VideoEntry[] = [];
      const idRegex = /^[a-zA-Z0-9_-]{11}$/;

      for (const item of parsed.playlist) {
        if (item && typeof item.id === 'string' && idRegex.test(item.id)) {
          const entry: VideoEntry = {
            id: item.id,
            addedAt: typeof item.addedAt === 'number' ? item.addedAt : Date.now(),
            title: typeof item.title === 'string' ? item.title.slice(0, 100) : undefined
          };
          validItems.push(entry);
        } else {
          skippedCount++;
        }
      }

      if (mode === 'replace') {
        // Deduplicate validItems by id
        const uniqueMap = new Map<string, VideoEntry>();
        for (const item of validItems) {
          if (!uniqueMap.has(item.id)) {
            uniqueMap.set(item.id, item);
          } else {
            skippedCount++;
          }
        }
        store.items = Array.from(uniqueMap.values());
        store.lastActiveIndex = 0;
        importedCount = store.items.length;
      } else {
        // Merge mode: append unique IDs not in current store
        const existingIds = new Set(store.items.map((i) => i.id));
        for (const item of validItems) {
          if (!existingIds.has(item.id)) {
            existingIds.add(item.id);
            store.items.push(item);
            importedCount++;
          } else {
            skippedCount++;
          }
        }
      }

      await this.save(store);
      return {
        success: true,
        importedCount,
        skippedCount
      };
    } catch (err) {
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        error: err instanceof Error ? err.message : 'JSON parse failure'
      };
    }
  }

  async clear(): Promise<void> {
    this.memoryCache = this.getDefaultStore();
    try {
      await del(STORAGE_KEY);
    } catch {}
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
}

export const storage = new StorageManager();
