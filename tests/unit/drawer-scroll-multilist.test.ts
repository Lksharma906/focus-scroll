// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PlaylistDrawer } from '../../src/components/drawer';
import { StorageManager } from '../../src/storage/db';
import { SAMPLE_BATCH_SHORTS } from '../../src/storage/seed';

describe('PlaylistDrawer Multi-List & Scrollability', () => {
  let storage: StorageManager;
  let drawer: PlaylistDrawer;
  let onPlaylistUpdatedMock: ReturnType<typeof vi.fn>;
  let onSelectVideoMock: ReturnType<typeof vi.fn>;
  let onToastMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    storage = new StorageManager();
    await storage.clear();

    onPlaylistUpdatedMock = vi.fn();
    onSelectVideoMock = vi.fn();
    onToastMock = vi.fn();

    drawer = new PlaylistDrawer(storage, {
      onPlaylistUpdated: onPlaylistUpdatedMock,
      onSelectVideo: onSelectVideoMock,
      onToast: onToastMock
    });

    const { backdrop, drawer: drawerEl } = drawer.getElements();
    document.body.appendChild(backdrop);
    document.body.appendChild(drawerEl);
  });

  it('renders drawer elements with correct structure and multi-list tabs', async () => {
    await drawer.open();
    const { drawer: drawerEl } = drawer.getElements();

    const tabsContainer = drawerEl.querySelector('#playlist-tabs-container');
    expect(tabsContainer).not.toBeNull();

    const tabs = tabsContainer?.querySelectorAll('.tab-pill');
    expect(tabs?.length).toBe(1);
    expect(tabs?.[0].textContent).toContain('Main Feed');
  });

  it('creates a new playlist and switches to it', async () => {
    await drawer.open();
    const { drawer: drawerEl } = drawer.getElements();

    const toggleNewBtn = drawerEl.querySelector('#btn-toggle-new-list') as HTMLButtonElement;
    toggleNewBtn.click();

    const inlineBar = drawerEl.querySelector('#inline-create-list') as HTMLElement;
    expect(inlineBar.style.display).not.toBe('none');

    const input = drawerEl.querySelector('#new-list-name-input') as HTMLInputElement;
    input.value = 'Workout Energy';

    const confirmBtn = drawerEl.querySelector('#btn-create-list-confirm') as HTMLButtonElement;
    confirmBtn.click();
    await new Promise((r) => setTimeout(r, 20));

    // Verify tabs updated
    const tabs = drawerEl.querySelectorAll('.tab-pill');
    expect(tabs.length).toBe(2);
    expect(tabs[1].textContent).toContain('Workout Energy');
    expect(onToastMock).toHaveBeenCalledWith(expect.stringContaining('Created list: Workout Energy'));
  });

  it('verifies list scroll container and adds multiple videos (scroll check)', async () => {
    await drawer.open();
    const { drawer: drawerEl } = drawer.getElements();

    const listUl = drawerEl.querySelector('#playlist-items-ul') as HTMLUListElement;
    expect(listUl).not.toBeNull();

    // Add 10 sample batch videos to test list population & scrolling
    for (const sample of SAMPLE_BATCH_SHORTS) {
      await storage.addItem(sample);
    }

    await drawer.open(); // re-triggers refreshState
    const items = listUl.querySelectorAll('.playlist-item');
    expect(items.length).toBe(10);

    // Verify container class and items header
    const container = drawerEl.querySelector('.playlist-list-container');
    expect(container).not.toBeNull();
    const summary = drawerEl.querySelector('#current-list-items-summary');
    expect(summary?.textContent).toContain('10 videos');

    // Verify each item has thumbnail and title
    const firstItem = items[0];
    const thumbImg = firstItem.querySelector('.item-thumb') as HTMLImageElement;
    expect(thumbImg.src).toContain(SAMPLE_BATCH_SHORTS[0].id);
    expect(firstItem.textContent).toContain('Rick Astley Classic');
  });

  it('deletes a video from the list and notifies callbacks', async () => {
    await storage.addItem(SAMPLE_BATCH_SHORTS[0]);
    await storage.addItem(SAMPLE_BATCH_SHORTS[1]);
    await drawer.open();

    const { drawer: drawerEl } = drawer.getElements();
    let items = drawerEl.querySelectorAll('.playlist-item');
    expect(items.length).toBe(2);

    const deleteBtn = items[0].querySelector('.item-delete-btn') as HTMLButtonElement;
    deleteBtn.click();
    await new Promise((r) => setTimeout(r, 20));

    items = drawerEl.querySelectorAll('.playlist-item');
    expect(items.length).toBe(1);
    expect(onPlaylistUpdatedMock).toHaveBeenCalled();
  });
});
