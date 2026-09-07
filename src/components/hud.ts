export class HUD {
  private element: HTMLElement;
  private positionPill: HTMLElement;
  private settingsBtn: HTMLElement;
  private fadeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(onOpenDrawer: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'hud-container';

    this.element.innerHTML = `
      <div class="hud-top">
        <div class="position-pill">1 / 1</div>
        <button class="hud-btn settings-toggle-btn" aria-label="Open Playlist Settings">
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
    `;

    this.positionPill = this.element.querySelector('.position-pill') as HTMLElement;
    this.settingsBtn = this.element.querySelector('.settings-toggle-btn') as HTMLElement;

    this.settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      onOpenDrawer();
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
