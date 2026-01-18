/**
 * DataRow Web Component
 *
 * Usage:
 * <data-row data='{data}'></data-row>
 *
 * Example `data` JSON:
 * {
 *   "options": {
 *     "show_column_names": true,
 *     "border-color": "darkgreen"
 *   },
 *   "columns": [
 *     { "name": "ID", "width": "10%", "contents": "T-01" },
 *     { "name": "Name", "width": "20%", "contents": "Build feature" },
 *     { "name": "Description", "width": "15%", "contents": "A long description that may overflow" },
 *     { "name": "Status", "width": "20%", "contents": "In Progress" },
 *     { "name": "Priority", "width": "20%", "contents": "High" },
 *     { "name": "ETA", "width": "15%", "contents": "2026-02-01" }
 *   ]
 * }
 *
 * Inputs (via `data` attribute, JSON):
 * - options: (optional) object
 *   - show_column_names: boolean (default: true) - whether to render the small column name label above contents
 *   - border-color: string (default: "black") - CSS color used for 2px border around the row
 * - columns: array of column objects
 *   - name: string - column label
 *   - width: string - CSS-like width (e.g., "20%", "120px", or "auto")
 *   - contents: string - content to render for the column
 *
 * Behavior notes:
 * - Percent widths are converted to pixel widths based on the available row space
 *   (accounting for gaps and padding) to prevent clipping/overflow.
 * - Column contents do not wrap; overflowing text is truncated and shows the
 *   full text as a native tooltip on hover (via the `title` attribute).
 */
class DataRow extends HTMLElement {
  constructor() {
    // Create shadow DOM and prepare css cache
    super();
    this.attachShadow({ mode: 'open' });
    this._css = null; // holds loaded css text
    this._cssLoaded = false; // flag to avoid re-fetching
  }

  static get observedAttributes() {
    return ['data'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // When the `data` attribute changes, re-render the component.
    // If CSS hasn't loaded yet, defer rendering to avoid a flash caused by
    // rendering without component CSS. We'll render after CSS is ensured.
    if (name === 'data' && oldValue !== newValue) {
      if (!this._cssLoaded) {
        this._pendingDataChange = true;
        return;
      }
      this.render();
    }
  }

  connectedCallback() {
    // Ensure CSS is loaded, then render. Also attach a resize listener
    // so percent-based columns recompute when the container size changes.
    this._ensureCss().then(() => {
      this._onResize = () => this.render();
      window.addEventListener('resize', this._onResize);
      this.render();
    });
  }

  disconnectedCallback() {
    if (this._onResize) window.removeEventListener('resize', this._onResize);
  }

  async _ensureCss() {
    if (this._cssLoaded) return;
    try {
      const url = new URL('./data-row.css', import.meta.url);
      const res = await fetch(url.href);
      this._css = await res.text();
    } catch (e) {
      this._css = '';
    }
    this._cssLoaded = true;
    // If a data attribute change happened while CSS was loading, render now.
    if (this._pendingDataChange) {
      this._pendingDataChange = false;
      this.render();
    }
  }

  render() {
    let raw = this.getAttribute('data') || '{}';
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = {};
    }
    const columns = Array.isArray(parsed.columns) ? parsed.columns : [];
    // Inject the loaded CSS into shadow DOM (if available)
    const style = this._css ? `<style>${this._css}</style>` : `<style>:host{display:block}</style>`;

    // default: show column names unless explicitly set to false
    const showNames = parsed && parsed.options && typeof parsed.options.show_column_names === 'boolean'
      ? parsed.options.show_column_names
      : true;

    // border color option: default to black
    const borderColor = parsed && parsed.options && parsed.options['border-color']
      ? parsed.options['border-color']
      : 'black';

    // Compute pixel widths for percent-based columns so gaps/padding do not
    // cause clipping. Measurements are approximate based on CSS values used.
    const gapPx = 12; // matches CSS gap between columns
    const pillPaddingLR = 10 * 2; // left + right padding from .pill (6px 10px)
    const hostWidth = Math.max(0, this.getBoundingClientRect().width);
    const totalGaps = Math.max(0, (columns.length - 1) * gapPx);
    const available = Math.max(0, hostWidth - totalGaps - pillPaddingLR);

    // Build column HTML. For percent widths we convert to integer pixels.
    const colsHtml = columns.map(col => {
      const width = col.width || 'auto';
      const name = col.name || '';
      const contents = col.contents || '';
      const safeWidth = String(width).trim();
      const nameHtml = showNames ? `<div class="name">${this._escapeHtml(name)}</div>` : '';

      // Percent width: compute pixel width from available space
      if (safeWidth.endsWith('%')) {
        const pct = parseFloat(safeWidth.replace('%', '')) || 0;
        const px = Math.floor((pct / 100) * available);
        return `<div class="col" style="flex: 0 0 ${px}px; max-width: ${px}px; width: ${px}px;">
          ${nameHtml}
          <div class="contents">${this._escapeHtml(contents)}</div>
        </div>`;
      }

      // auto: flexible column that grows/shrinks
      if (safeWidth === 'auto') {
        return `<div class="col" style="flex: 1 1 auto; min-width: 0;">
          ${nameHtml}
          <div class="contents">${this._escapeHtml(contents)}</div>
        </div>`;
      }

      // fallback: treat the provided width as a CSS value (e.g., "120px")
      return `<div class="col" style="flex: 0 0 ${safeWidth}; max-width: ${safeWidth};">
        ${nameHtml}
        <div class="contents">${this._escapeHtml(contents)}</div>
      </div>`;
    }).join('');

    // Render shadow DOM; apply 1px border with the configured color
    this.shadowRoot.innerHTML = `
      ${style}
      <div class="pill" style="border: 2px solid ${this._escapeHtml(borderColor)};">
        ${colsHtml}
      </div>
    `;

    // detect overflowing content and add a tooltip (title) for hover
    const contentEls = this.shadowRoot.querySelectorAll('.contents');
    contentEls.forEach(el => {
      // trigger layout and check overflow
      const isOverflowing = el.scrollWidth > el.clientWidth;
      if (isOverflowing) {
        el.setAttribute('title', el.textContent);
      } else {
        el.removeAttribute('title');
      }
    });
  }

  _escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

customElements.define('data-row', DataRow);

export default DataRow;
