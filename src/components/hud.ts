export interface HUDCallbacks {
  onOpenDrawer: () => void;
  onHome?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export class HUD {
  private element: HTMLElement;
  private positionPill: HTMLElement;
  private settingsBtn: HTMLElement;
  private homeBtn: HTMLElement | null = null;
  private prevBtn: HTMLElement | null = null;
  private nextBtn: HTMLElement | null = null;
  private fadeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(options: (() => void) | HUDCallbacks) {
    const callbacks: HUDCallbacks =
      typeof options === 'function' ? { onOpenDrawer: options } : options;

    this.element = document.createElement('div');
    this.element.className = 'hud-container';

    this.element.innerHTML = `
      <div class="hud-top">
        <button class="hud-btn home-toggle-btn" aria-label="Go to Home Screen" title="Feeds & Home (h)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </button>
        <div class="position-pill">1 / 1</div>
        <button class="hud-btn settings-toggle-btn" aria-label="Open Playlist Settings" title="Playlist Drawer (m)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="hud-nav-controls">
        <button class="hud-btn hud-nav-btn prev-btn" aria-label="Previous video" title="Previous (↑ or k)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        <button class="hud-btn hud-nav-btn next-btn" aria-label="Next video" title="Next (↓ or j)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
    `;

    this.positionPill = this.element.querySelector('.position-pill') as HTMLElement;
    this.settingsBtn = this.element.querySelector('.settings-toggle-btn') as HTMLElement;
    this.homeBtn = this.element.querySelector('.home-toggle-btn') as HTMLElement;
    this.prevBtn = this.element.querySelector('.prev-btn') as HTMLElement;
    this.nextBtn = this.element.querySelector('.next-btn') as HTMLElement;

    this.homeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onHome?.();
    });

    this.settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onOpenDrawer();
    });

    this.prevBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onPrevious?.();
    });

    this.nextBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      callbacks.onNext?.();
    });
  }

  getElement(): HTMLElement {
    return this.element;
  }

  updatePosition(current: number, total: number): void {
    this.positionPill.textContent = `${current} / ${total}`;
    this.wakePill();
  }

  wakePill(): void {
    this.positionPill.classList.remove('fade');
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
    }
    this.fadeTimeout = setTimeout(() => {
      this.positionPill.classList.add('fade');
      this.fadeTimeout = null;
    }, 3000);
  }
}
