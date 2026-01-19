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

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._resizeFallback) {
      window.removeEventListener('resize', this._resizeFallback);
      this._resizeFallback = null;
    }
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
        el.style.cursor = 'pointer';
        
        // Add click handler to dispatch card-click event with index
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          this.dispatchEvent(new CustomEvent('card-click', {
            detail: { index: i },
            bubbles: true,
            composed: true
          }));
        });
        
        const ph = placeholders[i];
        if (ph && ph.parentNode) ph.parentNode.replaceChild(el, ph);
        else grid.appendChild(el);
      });
      // After grid is populated, ensure we have a container-width watcher
      this._ensureContainerWatcher();
    });
  }

  _ensureContainerWatcher() {
    const wrap = this.querySelector('.pcg-wrap');
    if (!wrap) return;

    // Always install a container-width watcher that toggles size classes.
    // This ensures the grid responds to the actual container width even if
    // container queries are supported (they'll act as a progressive enhancement).

    // Setup ResizeObserver to add size classes based on the wrap's inline size.
    if (this._resizeObserver) this._resizeObserver.disconnect();

    const applySizeClass = (width) => {
      wrap.classList.remove('pcg-size-1', 'pcg-size-2', 'pcg-size-3');
      if (width <= 600) wrap.classList.add('pcg-size-1');
      else if (width <= 1024) wrap.classList.add('pcg-size-2');
      else wrap.classList.add('pcg-size-3');
    };

    try {
      this._resizeObserver = new ResizeObserver(entries => {
        if (!entries || !entries.length) return;
        const cr = entries[0].contentRect;
        applySizeClass(cr.width);
      });
      this._resizeObserver.observe(wrap);
      // Apply immediately
      applySizeClass(wrap.getBoundingClientRect().width);
    } catch (e) {
      // ResizeObserver not available; fallback to window resize listener
      const onResize = () => applySizeClass(wrap.getBoundingClientRect().width);
      window.addEventListener('resize', onResize);
      // store so we could remove later if needed
      this._resizeFallback = onResize;
      applySizeClass(wrap.getBoundingClientRect().width);
    }
  }
}

customElements.define('progress-card-grid', ProgressCardGrid);

export default ProgressCardGrid;
