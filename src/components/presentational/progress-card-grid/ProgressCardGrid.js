/**
 * ProgressCardGrid Web Component
 *
 * Usage:
 * <progress-card-grid data='{ "progress-cards": [...] }'></progress-card-grid>
 *
 * Expected `data` JSON:
 * {
 *   "progress-cards": [ { ...progress-card payload... }, ... ]
 * }
 */
import '../progress-card/ProgressCard.js';

class ProgressCardGrid extends HTMLElement {
  constructor() {
    super();
    this._css = null;
    this._cssLoaded = false;
    this._pendingDataChange = false;
  }

  static get observedAttributes() { return ['data']; }

  attributeChangedCallback(name, oldV, newV) {
    if (name === 'data' && oldV !== newV) {
      if (!this._cssLoaded) {
        this._pendingDataChange = true;
        return;
      }
      this.render();
    }
  }

  connectedCallback() {
    this._ensureCss().then(() => this.render());
  }

  async _ensureCss() {
    if (this._cssLoaded) return;
    try {
      const url = new URL('./progress-card-grid.css', import.meta.url);
      const res = await fetch(url.href);
      this._css = await res.text();
    } catch (e) {
      this._css = '';
    }
    this._cssLoaded = true;
    if (this._pendingDataChange) {
      this._pendingDataChange = false;
      this.render();
    }
  }

  render() {
    let raw = this.getAttribute('data') || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = {}; }

    const cards = Array.isArray(parsed['progress-cards']) ? parsed['progress-cards'] : [];

    const style = this._css ? `<style>${this._css}</style>` : '';

    // render wrapper and a lightweight placeholder grid
    this.innerHTML = `${style}
      <div class="pcg-wrap">
        <div class="pcg-grid" role="list"></div>
      </div>`;

    const grid = this.querySelector('.pcg-grid');
    if (!grid) return;

    // Insert placeholders to reserve layout
    grid.innerHTML = cards.map(() => `<div class="placeholder"></div>`).join('');

    // Replace placeholders with real progress-card elements on next frame
    requestAnimationFrame(() => {
      const placeholders = Array.from(grid.children);
      cards.forEach((card, i) => {
        const el = document.createElement('progress-card');
        const payload = JSON.stringify(card).replace(/</g, '\u003c');
        el.setAttribute('data', payload);
        el.setAttribute('role', 'listitem');
        const ph = placeholders[i];
        if (ph && ph.parentNode) ph.parentNode.replaceChild(el, ph);
        else grid.appendChild(el);
      });
    });
  }
}

customElements.define('progress-card-grid', ProgressCardGrid);

export default ProgressCardGrid;
