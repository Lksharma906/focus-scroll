import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from '../../src/storage/db';
import { SEED_SHORTS } from '../../src/storage/seed';

describe('StorageManager', () => {
  let storage: StorageManager;

  beforeEach(async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    storage = new StorageManager();
    await storage.clear();
  });

  it('initializes with default empty store and lastActiveIndex=0', async () => {
    const store = await storage.load();
    expect(store.version).toBe(1);
    expect(store.items).toEqual([]);
    expect(store.lastActiveIndex).toBe(0);
  });

  it('adds items and prevents duplicates', async () => {
    await storage.addItem({ id: 'abcdefghijk', addedAt: Date.now() });
    const store = await storage.load();
    expect(store.items.length).toBe(1);
    expect(store.items[0].id).toBe('abcdefghijk');

    // Duplicate should throw
    await expect(
      storage.addItem({ id: 'abcdefghijk', addedAt: Date.now() })
    ).rejects.toThrow('This video is already in your list');
  });

  it('persists and updates lastActiveIndex', async () => {
    await storage.addItem({ id: 'video111111', addedAt: Date.now() });
    await storage.addItem({ id: 'video222222', addedAt: Date.now() });
    await storage.saveActiveIndex(1);

    const store = await storage.load();
    expect(store.lastActiveIndex).toBe(1);
  });

  it('removes item and adjusts lastActiveIndex if out of bounds', async () => {
    await storage.addItem({ id: 'video111111', addedAt: Date.now() });
    await storage.addItem({ id: 'video222222', addedAt: Date.now() });
    await storage.saveActiveIndex(1);

    await storage.removeItem('video222222');
    const store = await storage.load();
    expect(store.items.length).toBe(1);
    expect(store.lastActiveIndex).toBe(0);
  });

  it('reorders items properly', async () => {
    await storage.addItem({ id: 'video111111', addedAt: Date.now() });
    await storage.addItem({ id: 'video222222', addedAt: Date.now() });
    await storage.reorder(0, 1);

    const store = await storage.load();
    expect(store.items[0].id).toBe('video222222');
    expect(store.items[1].id).toBe('video111111');
  });

  it('exports valid v1.0.0 JSON and re-imports with Replace mode', async () => {
    await storage.addItem({ id: 'video111111', addedAt: Date.now() });
    const exported = storage.exportJSON();
    expect(exported).toContain('"schema": "1.0.0"');
    expect(exported).toContain('video111111');

    await storage.clear();
    const result = await storage.importJSON(exported, 'replace');
    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);

    const store = await storage.load();
    expect(store.items.length).toBe(1);
  });

  it('imports with Merge mode preserving existing items without duplicates', async () => {
    await storage.addItem({ id: 'video111111', addedAt: Date.now() });
    const newJson = JSON.stringify({
      schema: '1.0.0',
      exportedAt: new Date().toISOString(),
      playlist: [
        { id: 'video111111', addedAt: Date.now() },
        { id: 'video333333', addedAt: Date.now() }
      ]
    });

    const result = await storage.importJSON(newJson, 'merge');
    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(1);

    const store = await storage.load();
    expect(store.items.length).toBe(2);
  });

  it('rejects unsupported schema major version', async () => {
    const invalidJson = JSON.stringify({
      schema: '2.0.0',
      playlist: [{ id: 'video111111' }]
    });
    const result = await storage.importJSON(invalidJson);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported schema major version 2');
  });

  it('verifies seed data contains 3 valid Shorts', () => {
    expect(SEED_SHORTS.length).toBe(3);
    for (const item of SEED_SHORTS) {
      expect(item.id).toMatch(/^[a-zA-Z0-9_-]{11}$/);
    }
  });
});
