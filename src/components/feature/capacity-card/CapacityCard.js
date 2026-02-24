/**
 * CapacityCard Web Component (Feature)
 *
 * Usage:
 * <capacity-card data='{"title":"Epic Name"}' open></capacity-card>
 */
class CapacityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._css = null;
    this._cssLoaded = false;
    this._pendingDataChange = false;
    this._onKeyDown = null;
  }

  static get observedAttributes() { return ['data', 'open']; }

  attributeChangedCallback() {
    if (!this._cssLoaded) {
      this._pendingDataChange = true;
      return;
    }
    this._render();
  }

  connectedCallback() {
    this._ensureCss().then(() => this._render());
    this._onKeyDown = (e) => {
      if (e.key === 'Escape' && this.hasAttribute('open')) {
        this._requestClose('escape');
      }
    };
    document.addEventListener('keydown', this._onKeyDown);
  }

  disconnectedCallback() {
    if (this._onKeyDown) {
      document.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
  }

  async _ensureCss() {
    if (this._cssLoaded) return;
    try {
      const url = new URL('./capacity-card.css', import.meta.url);
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

    this.shadowRoot.innerHTML = `
      <style>${this._css || ''}</style>
      <div class="backdrop" aria-hidden="true"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-label="Capacity Planner">
        <div class="title">${this._escapeHtml(title)}</div>
        <div class="subtitle">Capacity Planner</div>
        <div class="placeholder">placeholder div here</div>
        <div class="actions">
          <button type="button" class="btn cancel">Cancel</button>
          <button type="button" class="btn primary ok">OK</button>
        </div>
      </div>
    `;

    const cancelBtn = this.shadowRoot.querySelector('.btn.cancel');
    const okBtn = this.shadowRoot.querySelector('.btn.ok');
    const backdrop = this.shadowRoot.querySelector('.backdrop');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this._requestClose('cancel'));
    }
    if (okBtn) {
      okBtn.addEventListener('click', () => this._requestClose('ok'));
    }
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }
  }

  _requestClose(action) {
    this.removeAttribute('open');
    this.dispatchEvent(new CustomEvent('capacity-close', {
      detail: { action },
      bubbles: true,
      composed: true
    }));
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

customElements.define('capacity-card', CapacityCard);

export default CapacityCard;
