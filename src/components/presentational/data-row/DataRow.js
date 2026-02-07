/**
 * DataRow Web Component
 *
 * Usage:
 * <data-row data='{data}'></data-row>
 *
 * Example `data` JSON:
 * {
 *   "options": {
 *     "show-column-names": true,
 *     "has-border": true,
 *     "border-color": "darkgreen",
 *     "background-color": "#871F78"
 *   },
 *   "columns": [
 *     { "name": "ID", "width": "10%", "contents": "T-01", "num-lines": 1, "vertical-align": "center", "link": "https://example.com/T-01" },
 *     { "name": "Name", "width": "20%", "contents": "Build feature", "num-lines": 2, "vertical-align": "top" },
 *     { "name": "Description", "width": "30%", "contents": "A long description", "num-lines": 3, "vertical-align": "top" },
 *     { "name": "Status", "width": "15%", "contents": "In Progress" },
 *     { "name": "Priority", "width": "15%", "contents": "High" },
 *     { "name": "ETA", "width": "10%", "contents": "2026-02-01" }
 *   ]
 * }
 *
 * Inputs (via `data` attribute, JSON):
 * - options: (optional) object
 *   - show-column-names: boolean (default: true) - whether to render the small column name label above contents
 *   - has-border: boolean (default: true) - whether to show the border around the row
 *   - border-color: string (default: "black") - CSS color used for border around the row (when has-border is true)
 *   - background-color: string (optional) - CSS color used as a subtle background
 *     highlight for the row. If omitted the row is transparent. When provided
 *     the component converts the color to an `rgba(...)` with light alpha so
 *     it reads as a soft highlight behind the row.
 * - columns: array of column objects
 *   - name: string - column label
 *   - width: string - CSS-like width (e.g., "20%", "120px", or "auto")
 *   - contents: string - content to render for the column
 *   - num-lines: number (optional, default: 1) - maximum number of lines of text
 *     to display before truncating with "...". Uses CSS line-clamp for multi-line truncation.
 *   - vertical-align: string (optional, default: "center") - vertical alignment of column content.
 *     Options: "top", "center", "bottom".
 *   - link: string (optional) - if provided, the column contents will be rendered as a
 *     hyperlink to this URL. The link opens in a new tab (target="_blank").
 *
 * Behavior notes:
 * - Percent widths are converted to pixel widths based on the available row space
 *   (accounting for gaps and padding) to prevent clipping/overflow.
 * - Overflowing text is truncated and shows the full text as a native tooltip on hover (via the `title` attribute).
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
    const showNames = parsed && parsed.options && typeof parsed.options['show-column-names'] === 'boolean'
      ? parsed.options['show-column-names']
      : true;

    // has-border option: default to true
    const hasBorder = parsed && parsed.options && typeof parsed.options['has-border'] === 'boolean'
      ? parsed.options['has-border']
      : true;

    // border color option: default to black
    const borderColor = parsed && parsed.options && parsed.options['border-color']
      ? parsed.options['border-color']
      : 'black';

    // background color option: optional. If provided, convert to an rgba
    // value with subtle alpha so it reads as a highlight behind the row.
    const rawBg = parsed && parsed.options && parsed.options['background-color']
      ? parsed.options['background-color']
      : null;
    const bgRgba = rawBg ? this._colorToRgba(String(rawBg), 0.12) : 'transparent';

    // Compute pixel widths for percent-based columns so gaps/padding do not
    // cause clipping. Measurements are approximate based on CSS values used.
    const gapPx = 12; // matches CSS gap between columns
    const pillPaddingLR = 10 * 2; // left + right padding from .pill (6px 10px)
    const hostWidth = Math.max(0, this.getBoundingClientRect().width);
    const totalGaps = Math.max(0, (columns.length - 1) * gapPx);
    const available = Math.max(0, hostWidth - totalGaps - pillPaddingLR);

    // Build column HTML. For percent widths we convert to integer pixels.
    const colsHtml = columns.map((col, colIdx) => {
      const width = col.width || 'auto';
      const name = col.name || '';
      const contents = col.contents || '';
      const link = col.link;
      const numLines = col['num-lines'] != null ? parseInt(col['num-lines'], 10) : 1;
      const verticalAlign = col['vertical-align'] || 'center';
      const safeWidth = String(width).trim();
      const nameHtml = showNames ? `<div class="name">${this._escapeHtml(name)}</div>` : '';
      
      // Map vertical-align to CSS align-self values (to override parent's align-items: center)
      const alignMap = { 'top': 'flex-start', 'center': 'center', 'bottom': 'flex-end' };
      const alignSelf = alignMap[verticalAlign] || 'center';
      
      // Build contents div with appropriate line-clamp styling
      const contentsStyle = numLines > 1 
        ? `display: -webkit-box; -webkit-line-clamp: ${numLines}; -webkit-box-orient: vertical; overflow: hidden; white-space: normal;`
        : '';
      
      // If a link is provided, wrap contents in an anchor tag
      let contentsDiv;
      if (link && link !== '') {
        const escapedLink = this._escapeHtml(link);
        contentsDiv = `<div class="contents" style="${contentsStyle}"><a href="${escapedLink}" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">${this._escapeHtml(contents)}</a></div>`;
      } else {
        contentsDiv = `<div class="contents" style="${contentsStyle}">${this._escapeHtml(contents)}</div>`;
      }

      // Percent width: compute pixel width from available space
      if (safeWidth.endsWith('%')) {
        const pct = parseFloat(safeWidth.replace('%', '')) || 0;
        const px = Math.floor((pct / 100) * available);
        return `<div class="col" style="flex: 0 0 ${px}px; max-width: ${px}px; width: ${px}px; align-self: ${alignSelf};">
          ${nameHtml}
          ${contentsDiv}
        </div>`;
      }

      // auto: flexible column that grows/shrinks
      if (safeWidth === 'auto') {
        return `<div class="col" style="flex: 1 1 auto; min-width: 0; align-self: ${alignSelf};">
          ${nameHtml}
          ${contentsDiv}
        </div>`;
      }

      // fallback: treat the provided width as a CSS value (e.g., "120px")
      return `<div class="col" style="flex: 0 0 ${safeWidth}; max-width: ${safeWidth}; align-self: ${alignSelf};">
        ${nameHtml}
        ${contentsDiv}
      </div>`;
    }).join('');

    // Render shadow DOM; apply border (if enabled) with the configured color and
    // an optional subtle background highlight.
    const borderStyle = hasBorder ? `border: 2px solid ${this._escapeHtml(borderColor)};` : 'border: none;';
    this.shadowRoot.innerHTML = `
      ${style}
      <div class="pill" style="${borderStyle} background-color: ${this._escapeHtml(bgRgba)};">
        ${colsHtml}
      </div>
    `;

    // detect overflowing content and add a tooltip (title) for hover
    const contentEls = this.shadowRoot.querySelectorAll('.contents');
    contentEls.forEach(el => {
      // trigger layout and check overflow (horizontal or vertical)
      const isOverflowing = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
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

  _colorToRgba(colorStr, alpha) {
    // Convert a CSS color string to an rgba(...) string using the provided alpha.
    // Supports hex (#rgb, #rrggbb), rgb/rgba, or named colors via computed style.
    if (!colorStr) return 'transparent';
    const s = String(colorStr).trim();

    // hex (#rgb or #rrggbb)
    if (s[0] === '#') {
      let r, g, b;
      if (s.length === 4) {
        r = parseInt(s[1] + s[1], 16);
        g = parseInt(s[2] + s[2], 16);
        b = parseInt(s[3] + s[3], 16);
      } else if (s.length === 7) {
        r = parseInt(s.slice(1,3), 16);
        g = parseInt(s.slice(3,5), 16);
        b = parseInt(s.slice(5,7), 16);
      } else {
        return 'transparent';
      }
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // rgb/rgba input
    const m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const parts = m[1].split(',').map(p => p.trim());
      const r = parseInt(parts[0], 10) || 0;
      const g = parseInt(parts[1], 10) || 0;
      const b = parseInt(parts[2], 10) || 0;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Fallback: use computed style for named colors
    try {
      const el = document.createElement('div');
      el.style.color = s;
      el.style.display = 'none';
      document.body.appendChild(el);
      const cs = getComputedStyle(el).color; // e.g., 'rgb(135, 31, 120)'
      document.body.removeChild(el);
      const mm = cs.match(/rgba?\(([^)]+)\)/i);
      if (mm) {
        const parts = mm[1].split(',').map(p => p.trim());
        const r = parseInt(parts[0], 10) || 0;
        const g = parseInt(parts[1], 10) || 0;
        const b = parseInt(parts[2], 10) || 0;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    } catch (e) {
      // ignore and fallthrough
    }

    return 'transparent';
  }
}

customElements.define('data-row', DataRow);

export default DataRow;
