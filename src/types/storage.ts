/**
 * FocusScroll Storage Contract
 */

export interface VideoEntry {
  id: string;
  addedAt: number;
  title?: string;
}

export interface PlaylistStore {
  version: number;
  items: VideoEntry[];
  lastActiveIndex: number;
  updatedAt: number;
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
  importJSON(rawJson: string): Promise<ImportResult>;
  clear(): Promise<void>;
}
