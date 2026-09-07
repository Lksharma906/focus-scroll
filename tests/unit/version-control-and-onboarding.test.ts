// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from '../../src/storage/db';
import { OnboardingScreen } from '../../src/components/onboarding';
import { PlaylistDrawer } from '../../src/components/drawer';

describe('Version Control & Onboarding Recovery', () => {
  let storage: StorageManager;

  beforeEach(async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    storage = new StorageManager();
    await storage.clear();
  });

  describe('Version Control & Snapshots', () => {
    it('creates an automatic baseline version when none exists', async () => {
      const versions = await storage.getVersions();
      expect(versions.length).toBe(1);
      expect(versions[0].tag).toContain('v1.0.0 (Baseline)');
      expect(versions[0].summary.totalLists).toBe(1);
      expect(versions[0].summary.totalVideos).toBe(0);
    });

    it('creates named version snapshots capturing playlist state', async () => {
      await storage.addItem({ id: 'vid11111111', addedAt: Date.now(), title: 'First Video' });
      const snap = await storage.createVersion('v1.1', 'Before adding batch videos');

      expect(snap.tag).toBe('v1.1');
      expect(snap.description).toBe('Before adding batch videos');
      expect(snap.summary.totalVideos).toBe(1);

      const all = await storage.getVersions();
      expect(all.length).toBe(2);
      expect(all[0].tag).toBe('v1.1');
    });

    it('restores playlist state from a previous version snapshot', async () => {
      // Step 1: Add video A and create snapshot v1.1
      await storage.addItem({ id: 'videoAAAAAA1', addedAt: Date.now(), title: 'Video A' });
      const snap1 = await storage.createVersion('v1.1', 'Only Video A');

      // Step 2: Add video B and video C
      await storage.addItem({ id: 'videoBBBBBB2', addedAt: Date.now(), title: 'Video B' });
      await storage.addItem({ id: 'videoCCCCCC3', addedAt: Date.now(), title: 'Video C' });

      let currentStore = await storage.load();
      expect(currentStore.items.length).toBe(3);

      // Step 3: Rollback to snapshot v1.1
      const restored = await storage.restoreVersion(snap1.id);
      expect(restored.items.length).toBe(1);
      expect(restored.items[0].id).toBe('videoAAAAAA1');

      // Confirm re-loading store yields restored state
      currentStore = await storage.load();
      expect(currentStore.items.length).toBe(1);
      expect(currentStore.items[0].id).toBe('videoAAAAAA1');
    });

    it('deletes a version snapshot from history', async () => {
      const snap = await storage.createVersion('v1.temp', 'To be deleted');
      let versions = await storage.getVersions();
      expect(versions.some((v) => v.id === snap.id)).toBe(true);

      await storage.deleteVersion(snap.id);
      versions = await storage.getVersions();
      expect(versions.some((v) => v.id === snap.id)).toBe(false);
    });
  });

  describe('Bug Fix: Empty list & Back from Add Manual Videos', () => {
    it('does NOT permanently hide onboarding when clicking Add Video Manually', () => {
      let drawerOpened = false;
      const onboarding = new OnboardingScreen(
        () => {},
        () => { drawerOpened = true; }
      );

      const el = onboarding.getElement();
      document.body.appendChild(el);
      onboarding.show();
      expect(el.style.display).not.toBe('none');

      const addBtn = el.querySelector('.add-first-btn') as HTMLButtonElement;
      expect(addBtn).not.toBeNull();
      addBtn.click();

      // Drawer was opened
      expect(drawerOpened).toBe(true);
      // Crucial: onboarding screen remains in DOM and NOT hidden with display none
      expect(el.style.display).not.toBe('none');
    });

    it('triggers onClose on PlaylistDrawer when user clicks close / back', () => {
      const onCloseMock = vi.fn();
      const drawer = new PlaylistDrawer(storage, {
        onPlaylistUpdated: vi.fn(),
        onSelectVideo: vi.fn(),
        onToast: vi.fn(),
        onClose: onCloseMock
      });

      const { backdrop, drawer: drawerEl } = drawer.getElements();
      document.body.appendChild(backdrop);
      document.body.appendChild(drawerEl);

      const closeBtn = drawerEl.querySelector('.drawer-close') as HTMLButtonElement;
      expect(closeBtn).not.toBeNull();
      closeBtn.click();

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});
