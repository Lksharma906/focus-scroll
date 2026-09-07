export class ReplayOverlay {
  private element: HTMLElement;

  constructor(onReplay: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'replay-overlay';
    this.element.style.display = 'none';
    this.element.innerHTML = `
      <button class="replay-btn" aria-label="Replay video">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10"></polyline>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
        </svg>
      </button>
      <span class="replay-label">Replay Short</span>
    `;

    const btn = this.element.querySelector('.replay-btn');
    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
      onReplay();
    });
  }

  getElement(): HTMLElement {
    return this.element;
  }

  show(): void {
    this.element.style.display = 'flex';
  }

  hide(): void {
    this.element.style.display = 'none';
  }
}
