import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from '../../src/storage/db';
import { SAMPLE_BATCH_SHORTS } from '../../src/storage/seed';

describe('StorageManager Multi-List Management', () => {
  let storage: StorageManager;

  beforeEach(async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    storage = new StorageManager();
    await storage.clear();
  });

  it('starts with a default list', async () => {
    const lists = await storage.getLists();
    expect(lists.length).toBe(1);
    expect(lists[0].name).toBe('Main Feed');
    expect(lists[0].id).toBe('default');

    const active = await storage.getActiveList();
    expect(active.id).toBe('default');
  });

  it('allows user to create multiple new lists', async () => {
    const list1 = await storage.createList('Workout Motivation');
    expect(list1.name).toBe('Workout Motivation');
    expect(list1.items).toEqual([]);

    const list2 = await storage.createList('Chill Vibes');
    expect(list2.name).toBe('Chill Vibes');

    const allLists = await storage.getLists();
    expect(allLists.length).toBe(3); // default + list1 + list2

    // Newly created list becomes active
    const active = await storage.getActiveList();
    expect(active.id).toBe(list2.id);
  });

  it('keeps video items isolated between different lists', async () => {
    // Add to default list
    await storage.addItem({ id: 'videoDef0001', addedAt: Date.now(), title: 'Def Video 1' });
    let store = await storage.load();
    expect(store.items.length).toBe(1);

    // Create a new list and switch to it
    const studyList = await storage.createList('Study Lo-Fi');
    store = await storage.load();
    expect(store.items.length).toBe(0); // study list is empty

    // Add video to study list
    await storage.addItem({ id: 'videoStudy01', addedAt: Date.now(), title: 'Study Video 1' });
    await storage.addItem({ id: 'videoStudy02', addedAt: Date.now(), title: 'Study Video 2' });
    store = await storage.load();
    expect(store.items.length).toBe(2);

    // Switch back to default list
    await storage.switchList('default');
    store = await storage.load();
    expect(store.items.length).toBe(1);
    expect(store.items[0].id).toBe('videoDef0001');

    // Switch back to study list
    await storage.switchList(studyList.id);
    store = await storage.load();
    expect(store.items.length).toBe(2);
    expect(store.items[0].id).toBe('videoStudy01');
  });

  it('allows deleting a list and automatically falls back to an available list', async () => {
    await storage.createList('Temporary 1');
    const temp2 = await storage.createList('Temporary 2');
    expect((await storage.getLists()).length).toBe(3);

    // Currently active is temp2
    expect((await storage.getActiveList()).id).toBe(temp2.id);

    // Delete temp2
    const nextActive = await storage.deleteList(temp2.id);
    expect(nextActive.id).toBe('default');

    const remainingLists = await storage.getLists();
    expect(remainingLists.length).toBe(2);
    expect(remainingLists.some((l) => l.id === temp2.id)).toBe(false);
  });

  it('prevents deleting the only remaining list', async () => {
    const lists = await storage.getLists();
    expect(lists.length).toBe(1);

    await expect(storage.deleteList(lists[0].id)).rejects.toThrow('Cannot delete the only list');
  });

  it('allows adding multiple videos and verifies list length for scrolling support', async () => {
    await storage.createList('Batch Scroll Test');

    for (const sample of SAMPLE_BATCH_SHORTS) {
      await storage.addItem(sample);
    }

    const store = await storage.load();
    expect(store.items.length).toBe(SAMPLE_BATCH_SHORTS.length);
    expect(store.items.length).toBe(10);
    expect(store.items[0].id).toBe(SAMPLE_BATCH_SHORTS[0].id);
    expect(store.items[9].id).toBe(SAMPLE_BATCH_SHORTS[9].id);
  });

  it('can rename a list', async () => {
    const list = await storage.createList('Old Name');
    await storage.renameList(list.id, 'Fresh Brand New Name');

    const all = await storage.getLists();
    const updated = all.find((l) => l.id === list.id);
    expect(updated?.name).toBe('Fresh Brand New Name');
  });

  it('backs up and restores all playlists and content seamlessly', async () => {
    await storage.addItem({ id: 'mainVid0001', addedAt: Date.now() });
    await storage.createList('Workout Motivation');
    await storage.addItem({ id: 'workVid0001', addedAt: Date.now(), title: 'Lift Heavy' });
    await storage.addItem({ id: 'workVid0002', addedAt: Date.now(), title: 'Cardio' });

    // Full export
    const backupJson = storage.exportJSON();
    expect(backupJson).toContain('Workout Motivation');
    expect(backupJson).toContain('workVid0001');

    // Wipe store
    await storage.clear();
    const wipedLists = await storage.getLists();
    expect(wipedLists.length).toBe(1);

    // Restore backup
    const importRes = await storage.importJSON(backupJson, 'replace');
    expect(importRes.success).toBe(true);

    const restoredLists = await storage.getLists();
    expect(restoredLists.length).toBe(2);
    expect(restoredLists.some((l) => l.name === 'Workout Motivation')).toBe(true);
    const restoredWorkout = restoredLists.find((l) => l.name === 'Workout Motivation');
    expect(restoredWorkout?.items.length).toBe(2);
  });
});
