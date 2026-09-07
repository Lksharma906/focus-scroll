/**
 * FocusScroll Storage Contract
 */

export interface VideoEntry {
  id: string;
  addedAt: number;
  title?: string;
}

export interface Playlist {
  id: string;
  name: string;
  items: VideoEntry[];
  lastActiveIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface PlaylistStore {
  version: number;
  items: VideoEntry[];
  lastActiveIndex: number;
  updatedAt: number;
  activeListId: string;
  lists: Playlist[];
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  error?: string;
}

export interface IStorageManager {
  load(): Promise<PlaylistStore>;
  addItem(entry: VideoEntry): Promise<void>;
  removeItem(videoId: string): Promise<void>;
  reorder(fromIndex: number, toIndex: number): Promise<void>;
  saveActiveIndex(index: number): Promise<void>;
  exportJSON(): string;
  importJSON(rawJson: string, mode?: 'replace' | 'merge'): Promise<ImportResult>;
  clear(): Promise<void>;

  // Multi-list support
  getLists(): Promise<Playlist[]>;
  getActiveList(): Promise<Playlist>;
  createList(name: string): Promise<Playlist>;
  deleteList(listId: string): Promise<Playlist>;
  switchList(listId: string): Promise<Playlist>;
  renameList(listId: string, newName: string): Promise<void>;
}
