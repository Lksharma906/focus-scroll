export class BufferingSpinner {
  private element: HTMLElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'spinner-overlay';
    this.element.style.display = 'none';
    this.element.innerHTML = `<div class="spinner"></div>`;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  show(): void {
    this.element.style.display = 'block';
  }

  hide(): void {
    this.element.style.display = 'none';
  }
}
