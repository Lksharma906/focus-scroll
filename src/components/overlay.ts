export class TouchOverlay {
  private element: HTMLElement;

  constructor(onClick?: () => void) {
    this.element = document.createElement('div');
    this.element.className = 'touch-overlay';
    if (onClick) {
      this.element.addEventListener('click', onClick);
    }
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
