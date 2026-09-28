export class SeekIndicator {
  private element: HTMLElement;
  private iconEl: HTMLElement;
  private labelEl: HTMLElement;
  private fadeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'seek-indicator';
    this.element.innerHTML = `
      <div class="seek-indicator-content">
        <span class="seek-indicator-icon"></span>
        <span class="seek-indicator-label"></span>
      </div>
    `;
    this.iconEl = this.element.querySelector('.seek-indicator-icon') as HTMLElement;
    this.labelEl = this.element.querySelector('.seek-indicator-label') as HTMLElement;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  trigger(deltaSeconds: number, targetTime?: number): void {
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
    }

    const isForward = deltaSeconds > 0;
    this.element.classList.remove('backward', 'forward');
    this.element.classList.add(isForward ? 'forward' : 'backward');

    const formattedTime =
      typeof targetTime === 'number' && targetTime >= 0
        ? ` (${Math.floor(targetTime / 60)}:${Math.floor(targetTime % 60).toString().padStart(2, '0')})`
        : '';

    if (isForward) {
      this.iconEl.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 4 15 12 5 20 5 4"></polygon>
          <line x1="19" y1="5" x2="19" y2="19"></line>
        </svg>
      `;
      this.labelEl.textContent = `+${Math.abs(deltaSeconds)}s${formattedTime}`;
    } else {
      this.iconEl.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="19 20 9 12 19 4 19 20"></polygon>
          <line x1="5" y1="19" x2="5" y2="5"></line>
        </svg>
      `;
      this.labelEl.textContent = `-${Math.abs(deltaSeconds)}s${formattedTime}`;
    }

    this.element.classList.add('show');
    this.fadeTimeout = setTimeout(() => {
      this.element.classList.remove('show');
      this.fadeTimeout = null;
    }, 850);
  }
}
