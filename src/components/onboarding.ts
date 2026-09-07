export class OnboardingScreen {
  private element: HTMLElement;

  constructor(
    onLoadSamples: () => void,
    onOpenDrawer: () => void
  ) {
    this.element = document.createElement('div');
    this.element.className = 'onboarding-screen';
    this.element.innerHTML = `
      <div class="onboarding-title">FocusScroll</div>
      <p class="onboarding-desc">
        Distraction-free, curated short videos with zero algorithmic recommendations and no endless doomscrolling.
      </p>
      <div class="onboarding-actions">
        <button class="btn-primary load-samples-btn">Load Sample Videos</button>
        <button class="btn-secondary add-first-btn">Add Video Manually</button>
      </div>
    `;

    this.element.querySelector('.load-samples-btn')?.addEventListener('click', () => {
      this.hide();
      onLoadSamples();
    });

    this.element.querySelector('.add-first-btn')?.addEventListener('click', () => {
      onOpenDrawer();
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
