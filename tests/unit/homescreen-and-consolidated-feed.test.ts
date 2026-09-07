// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from '../../src/storage/db';
import { HomeScreen } from '../../src/components/home';

describe('HomeScreen & Consolidated Main Feed', () => {
  let storage: StorageManager;

  beforeEach(async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    storage = new StorageManager();
    await storage.clear();
  });

  describe('Consolidated Feed Logic', () => {
    it('aggregates videos from all lists into the consolidated feed', async () => {
      // Add 1 video to default list
      await storage.addItem({ id: 'videoDef0001', addedAt: Date.now(), title: 'Main Short' });

      // Create a workout list and add 2 videos
      const workoutList = await storage.createList('Workout');
      await storage.addItem({ id: 'videoWork001', addedAt: Date.now(), title: 'Workout 1' });
      await storage.addItem({ id: 'videoWork002', addedAt: Date.now(), title: 'Workout 2' });

      // Create a chill list and add 1 video
      await storage.createList('Chill');
      await storage.addItem({ id: 'videoChill01', addedAt: Date.now(), title: 'Chill 1' });

      // Consolidated feed should contain all 4 videos
      const consolidated = await storage.getConsolidatedVideos();
      expect(consolidated.length).toBe(4);
      const ids = consolidated.map((v) => v.id);
      expect(ids).toContain('videoDef0001');
      expect(ids).toContain('videoWork001');
      expect(ids).toContain('videoWork002');
      expect(ids).toContain('videoChill01');

      // Individual list items remain isolated
      const workoutVideos = await storage.getFeedVideos(workoutList.id);
      expect(workoutVideos.length).toBe(2);
      expect(workoutVideos.map((v) => v.id)).toEqual(['videoWork001', 'videoWork002']);
    });

    it('deduplicates identical videos if present in multiple playlists', async () => {
      await storage.addItem({ id: 'sharedVid001', addedAt: Date.now(), title: 'Shared 1' });
      const customList = await storage.createList('Favorites');
      expect(customList.name).toBe('Favorites');
      await storage.addItem({ id: 'sharedVid001', addedAt: Date.now(), title: 'Shared 1' });

      const consolidated = await storage.getConsolidatedVideos();
      expect(consolidated.length).toBe(1);
      expect(consolidated[0].id).toBe('sharedVid001');
    });

    it('shuffles videos when shuffle flag is enabled', async () => {
      // Add 10 items
      for (let i = 0; i < 10; i++) {
        await storage.addItem({ id: `vidShuffle${i}`, addedAt: Date.now() });
      }

      const original = await storage.getConsolidatedVideos(false);
      const shuffled = await storage.getConsolidatedVideos(true);

      expect(shuffled.length).toBe(10);
      // All items exist
      original.forEach((v) => {
        expect(shuffled.some((s) => s.id === v.id)).toBe(true);
      });
    });
  });

  describe('HomeScreen Component Rendering & Actions', () => {
    it('renders header with brand, version info, and hero consolidated card', async () => {
      const onPlayFeed = vi.fn();
      const onOpenDrawer = vi.fn();
      const onOpenVersionControl = vi.fn();

      const home = new HomeScreen(storage, {
        onPlayFeed,
        onOpenDrawer,
        onOpenVersionControl,
        onLoadSamples: async () => {},
        onToast: () => {}
      });

      const el = home.getElement();
      await home.render();

      expect(el.querySelector('.home-brand-title')?.textContent).toBe('FocusScroll');
      expect(el.querySelector('#home-btn-version')?.textContent).toContain('v1.0.0');

      // Empty state prompt visible when 0 videos
      const emptyCard = el.querySelector('.home-empty-card') as HTMLElement;
      expect(emptyCard).not.toBeNull();
    });

    it('displays playlist cards and triggers play on click', async () => {
      await storage.addItem({ id: 'videoSample1', addedAt: Date.now(), title: 'Test Sample' });
      await storage.createList('Gaming');
      await storage.addItem({ id: 'videoGaming1', addedAt: Date.now(), title: 'Game Clip' });

      const onPlayFeed = vi.fn();
      const home = new HomeScreen(storage, {
        onPlayFeed,
        onOpenDrawer: vi.fn(),
        onOpenVersionControl: vi.fn(),
        onLoadSamples: async () => {},
        onToast: () => {}
      });

      const el = home.getElement();
      await home.render();

      // Check stat pill shows 2 videos
      expect(el.querySelector('.hero-stat-pill')?.textContent).toBe('2 videos');

      // Click Hero Play Main Feed button
      const heroPlayBtn = el.querySelector('#home-hero-play-btn') as HTMLButtonElement;
      heroPlayBtn.click();
      await new Promise((r) => setTimeout(r, 20));
      expect(onPlayFeed).toHaveBeenCalledWith('default', true);

      // Click individual playlist card
      const gamingCard = el.querySelector('.playlist-card[data-id^="list_"]') as HTMLElement;
      expect(gamingCard).not.toBeNull();
      gamingCard.click();
      await new Promise((r) => setTimeout(r, 20));
      expect(onPlayFeed).toHaveBeenCalledWith(expect.stringContaining('list_'), false);
    });

    it('triggers version control modal from home screen version button', async () => {
      const onOpenVersionControl = vi.fn();
      const home = new HomeScreen(storage, {
        onPlayFeed: vi.fn(),
        onOpenDrawer: vi.fn(),
        onOpenVersionControl,
        onLoadSamples: async () => {},
        onToast: () => {}
      });

      const el = home.getElement();
      await home.render();

      const versionBtn = el.querySelector('#home-btn-version') as HTMLButtonElement;
      versionBtn.click();
      expect(onOpenVersionControl).toHaveBeenCalledTimes(1);
    });
  });
});
