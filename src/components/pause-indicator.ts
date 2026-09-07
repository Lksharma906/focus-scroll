export class PauseIndicator {
  private element: HTMLElement;
  private fadeTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'pause-indicator';
    this.element.innerHTML = `
      <svg width="32" height="32" viewBox="0 0 24 24" fill="#ffffff">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
      </svg>
    `;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  trigger(): void {
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
    }
    this.element.classList.add('show');
    this.fadeTimeout = setTimeout(() => {
      this.element.classList.remove('show');
      this.fadeTimeout = null;
    }, 700);
  }
}
