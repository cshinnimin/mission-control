/**
 * ProgressCard Web Component
 *
 * Usage:
 * <progress-card data='{...}'></progress-card>
 *
 * Expected `data` JSON:
 * {
 *   "title": "Card Title 1",
 *   "data-row": { ... },    // same schema as `data-row` component
 *   "progress": 35,         // percent (0-100)
 *   "blocked": 15           // percent (0-100)
 * }
 *
 * Layout:
 * - Large title at top
 * - A `data-row` rendered beneath the title using the supplied `data-row`
 * - A rounded progress track beneath the data-row. The left side shows
 *   completed progress in dark green, the right side shows blocked portion
 *   in dark red. The track fills the horizontal space of its container.
 */
import '../data-row/DataRow.js';

class ProgressCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._css = null;
    this._cssLoaded = false;
    this._pendingDataChange = false;
  }

  static get observedAttributes() { return ['data']; }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'data' && oldVal !== newVal) {
      if (!this._cssLoaded) {
        this._pendingDataChange = true;
        return;
      }
      this._render();
    }
  }

  connectedCallback() {
    this._ensureCss().then(() => this._render());
  }

  async _ensureCss() {
    if (this._cssLoaded) return;
    try {
      const url = new URL('./progress-card.css', import.meta.url);
      const res = await fetch(url.href);
      this._css = await res.text();
    } catch (e) {
      this._css = '';
    }
    this._cssLoaded = true;
    if (this._pendingDataChange) {
      this._pendingDataChange = false;
      this._render();
    }
  }

  _render() {
    let raw = this.getAttribute('data') || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = {}; }

    const title = parsed.title || '';
    const dataRow = parsed['data-row'] || {};
    const progress = Math.max(0, Math.min(100, Number(parsed.progress) || 0));
    const blocked = Math.max(0, Math.min(100, Number(parsed.blocked) || 0));

    const style = this._css ? `<style>${this._css}</style>` : `<style>:host{display:block}</style>`;

    // compose inner HTML with a left-side label and bordered progress track
    this.shadowRoot.innerHTML = `
      ${style}
      <div class="card">
        <div class="title">${this._escapeHtml(title)}</div>
        <div class="data-row-wrap">
          <data-row data='${this._escapeHtml(JSON.stringify(dataRow))}'></data-row>
        </div>
        <div class="progress-row">
          <div class="progress-label">Progress:</div>
          <div class="progress-track" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
            <div class="progress-bar" style="width: ${progress}%;"></div>
            <div class="blocked-bar" style="width: ${blocked}%;"></div>
          </div>
        </div>
      </div>
    `;
  }

  _escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

customElements.define('progress-card', ProgressCard);

export default ProgressCard;
