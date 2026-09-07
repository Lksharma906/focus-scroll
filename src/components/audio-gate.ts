export class AudioGate {
  private element: HTMLElement;
  private isVisible = true;

  constructor(onUnlock: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'audio-gate-overlay';
    this.element.innerHTML = `
      <button class="audio-gate-btn" aria-label="Tap to play video with audio">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <span>Tap to Play</span>
      </button>
    `;

    this.element.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
      onUnlock();
    });
  }

  getElement(): HTMLElement {
    return this.element;
  }

  show(): void {
    this.element.style.display = 'flex';
    this.element.style.opacity = '1';
    this.isVisible = true;
  }

  hide(): void {
    if (!this.isVisible) return;
    this.element.style.opacity = '0';
    setTimeout(() => {
      this.element.style.display = 'none';
      this.isVisible = false;
    }, 250);
  }
}
