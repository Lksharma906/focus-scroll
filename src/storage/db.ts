import { get, set, del } from 'idb-keyval';
import { IStorageManager, PlaylistStore, VideoEntry, Playlist, ImportResult } from '../types/storage';

const STORAGE_KEY = 'focus_scroll_playlist_v1';

export class StorageManager implements IStorageManager {
  private memoryCache: PlaylistStore | null = null;

  private getDefaultStore(): PlaylistStore {
    const defaultList: Playlist = {
      id: 'default',
      name: 'Main Feed',
      items: [],
      lastActiveIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return {
      version: 1,
      items: [],
      lastActiveIndex: 0,
      updatedAt: Date.now(),
      activeListId: 'default',
      lists: [defaultList]
    };
  }

  private normalizeStore(store: Partial<PlaylistStore>): PlaylistStore {
    const rawLists = Array.isArray(store.lists) && store.lists.length > 0 ? store.lists : [];
    let lists: Playlist[];

    if (rawLists.length === 0) {
      const defaultList: Playlist = {
        id: 'default',
        name: 'Main Feed',
        items: Array.isArray(store.items) ? store.items : [],
        lastActiveIndex: typeof store.lastActiveIndex === 'number' ? store.lastActiveIndex : 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      lists = [defaultList];
    } else {
      lists = rawLists.map((list) => ({
        id: list.id || `list_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: list.name || 'Untitled List',
        items: Array.isArray(list.items) ? list.items : [],
        lastActiveIndex: typeof list.lastActiveIndex === 'number' ? list.lastActiveIndex : 0,
        createdAt: typeof list.createdAt === 'number' ? list.createdAt : Date.now(),
        updatedAt: typeof list.updatedAt === 'number' ? list.updatedAt : Date.now()
      }));
    }

    let activeListId = store.activeListId;
    let activeList = lists.find((l) => l.id === activeListId);
    if (!activeList) {
      activeList = lists[0];
      activeListId = activeList.id;
    }

    return {
      version: store.version || 1,
      items: activeList.items,
      lastActiveIndex: activeList.lastActiveIndex,
      updatedAt: store.updatedAt || Date.now(),
      activeListId: activeList.id,
      lists
    };
  }

  async load(): Promise<PlaylistStore> {
    if (this.memoryCache) {
      return this.memoryCache;
    }

    try {
      const data = await get<Partial<PlaylistStore>>(STORAGE_KEY);
      if (data && (Array.isArray(data.items) || Array.isArray(data.lists))) {
        const normalized = this.normalizeStore(data);
        this.memoryCache = normalized;
        return normalized;
      }
    } catch {
      // Fallback to localStorage
    }

    try {
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData) as Partial<PlaylistStore>;
        if (parsed && (Array.isArray(parsed.items) || Array.isArray(parsed.lists))) {
          const normalized = this.normalizeStore(parsed);
          this.memoryCache = normalized;
          return normalized;
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

    // Keep active list in sync
    const activeList = store.lists.find((l) => l.id === store.activeListId);
    if (activeList) {
      activeList.items = store.items;
      activeList.lastActiveIndex = store.lastActiveIndex;
      activeList.updatedAt = store.updatedAt;
    }

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

  // --- Multi-list Management ---

  async getLists(): Promise<Playlist[]> {
    const store = await this.load();
    return store.lists;
  }

  async getActiveList(): Promise<Playlist> {
    const store = await this.load();
    const active = store.lists.find((l) => l.id === store.activeListId);
    return active || store.lists[0];
  }

  async createList(name: string): Promise<Playlist> {
    const store = await this.load();
    const cleanName = name.trim() || `Playlist ${store.lists.length + 1}`;
    const newList: Playlist = {
      id: `list_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      items: [],
      lastActiveIndex: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    store.lists.push(newList);
    store.activeListId = newList.id;
    store.items = newList.items;
    store.lastActiveIndex = newList.lastActiveIndex;
    await this.save(store);
    return newList;
  }

  async deleteList(listId: string): Promise<Playlist> {
    const store = await this.load();
    if (store.lists.length <= 1) {
      throw new Error('Cannot delete the only list');
    }

    const index = store.lists.findIndex((l) => l.id === listId);
    if (index === -1) {
      throw new Error('List not found');
    }

    store.lists.splice(index, 1);

    if (store.activeListId === listId) {
      const fallbackList = store.lists[0];
      store.activeListId = fallbackList.id;
      store.items = fallbackList.items;
      store.lastActiveIndex = fallbackList.lastActiveIndex;
    }

    await this.save(store);
    return this.getActiveList();
  }

  async switchList(listId: string): Promise<Playlist> {
    const store = await this.load();
    const target = store.lists.find((l) => l.id === listId);
    if (!target) {
      throw new Error('List not found');
    }

    // Save current active items state
    const current = store.lists.find((l) => l.id === store.activeListId);
    if (current) {
      current.items = store.items;
      current.lastActiveIndex = store.lastActiveIndex;
    }

    store.activeListId = target.id;
    store.items = target.items;
    store.lastActiveIndex = target.lastActiveIndex;
    await this.save(store);
    return target;
  }

  async renameList(listId: string, newName: string): Promise<void> {
    const cleanName = newName.trim();
    if (!cleanName) return;

    const store = await this.load();
    const target = store.lists.find((l) => l.id === listId);
    if (target) {
      target.name = cleanName;
      target.updatedAt = Date.now();
      await this.save(store);
    }
  }

  // --- Export / Import ---

  exportJSON(): string {
    const store = this.memoryCache || this.getDefaultStore();
    const payload = {
      schema: '1.0.0',
      exportedAt: new Date().toISOString(),
      playlist: store.items,
      lists: store.lists,
      activeListId: store.activeListId
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
