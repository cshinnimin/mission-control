/**
 * ExpandableRow Web Component
 *
 * Usage:
 * <expandable-row data='{data}'></expandable-row>
 * 
 * Example `data` JSON:
 * {
 *     "data-row": { ... },            // same schema as `data-row` component
 *     "expandable-list": { ... },     // same schema as `expandable-list` component
 *     "options": {
 *         "border-color": "black",
 *         "background-color": "transparent"
 *      }
 * }
 *
 * Expects `data` JSON with two top-level keys: `data-row` and `expandable-list`.
 * - `data-row`: object compatible with the existing `data-row` component
 *   - Each column can include a `num-lines` property to control text truncation
 *   - Each column can include a `vertical-align` property to control vertical alignment
 * - `expandable-list`: object compatible with `expandable-list` component
 *   - Can include `column-num-lines` array to control text truncation for list rows
 *   - Can include `column-vertical-aligns` array to control vertical alignment for list rows
 * - `options`: (optional) object
 *   - `border-color`: string (default: medium gray `#777`) - CSS color used for the
 *     rounded container border around the row
 *   - `background-color`: string (optional) - CSS color used as a subtle
 *     background highlight for the container. If you want to highlight the
 *     inner `data-row`, include `background-color` inside the `data-row`
 *     payload; `data-row` supports `options.background-color` which will be
 *     applied as a soft, semi-transparent fill.
 *
 * Layout:
 * - Rounded box (`.container`) with a top row containing the `data-row`
 *   and a small expand/collapse button aligned to the right.
 * - The `expandable-list` is rendered underneath and collapsed by default.
 */
import '../data-row/DataRow.js';
import '../expandable-list/ExpandableList.js';

class ExpandableRow extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._css = null;
    this._cssLoaded = false;
    this._pendingDataChange = false;
    this._expanded = false;
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
      const url = new URL('./expandable-row.css', import.meta.url);
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

    const dataRow = parsed['data-row'] || {};
    const listData = parsed['expandable-list'] || {};
    // options: allow configuring border color (default to medium gray)
    const options = parsed.options || {};
    const borderColor = options['border-color'] || '#777';

    // Compose inner HTML - include css + structure
    const style = this._css ? `<style>${this._css}</style>` : `<style>:host{display:block}</style>`;
    this.shadowRoot.innerHTML = `
      ${style}
      <div class="container" style="border: 2px solid ${this._escapeHtml(borderColor)};">
        <div class="top">
          <div class="main">
            <data-row data='${this._escapeHtml(JSON.stringify(dataRow))}'></data-row>
          </div>
          <button class="toggle" aria-expanded="false" title="Expand/Collapse">
            <svg class="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9l6 6 6-6" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="list" style="max-height:0">
          <expandable-list data='${this._escapeHtml(JSON.stringify(listData))}'></expandable-list>
        </div>
      </div>
    `;

    // wire up toggle behavior
    const toggle = this.shadowRoot.querySelector('.toggle');
    const chev = this.shadowRoot.querySelector('.chev');
    const listEl = this.shadowRoot.querySelector('.list');

    // compute collapsed max-height (0) and expanded max-height to fit content
    const expand = () => {
      const inner = listEl.firstElementChild; // expandable-list
      if (inner && inner.setAttribute) inner.setAttribute('expanded', 'true');

      // Wait for the child's content to appear. Use MutationObserver to
      // detect when ExpandableList populates its internal `.expandable-rows`.
      let settled = false;
      const applyMeasurement = () => {
        if (settled) return;
        settled = true;
        let h = 0;
        if (inner) {
          const rowsContainer = inner.querySelector('.expandable-rows');
          if (rowsContainer) h = rowsContainer.scrollHeight;
          else h = inner.scrollHeight || inner.getBoundingClientRect().height;
        }
        // add a small buffer to ensure margins/padding on the last row aren't clipped
        h = Math.ceil(h + 20);
        listEl.style.maxHeight = h + 'px';
        listEl.style.overflow = 'hidden';
        toggle.setAttribute('aria-expanded', 'true');
        chev.classList.add('open');
        this._expanded = true;
        if (mo) mo.disconnect();
        if (timeoutId) clearTimeout(timeoutId);
      };

      let mo = null;
      if (inner) {
        mo = new MutationObserver(() => {
          const rc = inner.querySelector('.expandable-rows');
          if (rc && rc.scrollHeight > 0) applyMeasurement();
        });
        mo.observe(inner, { childList: true, subtree: true });
      }

      // Fallback: measure after a short timeout in case mutations didn't fire
      const timeoutId = setTimeout(() => applyMeasurement(), 300);
    };

    const collapse = () => {
      const inner = listEl.firstElementChild;
      // collapse visually
      listEl.style.maxHeight = '0';
      toggle.setAttribute('aria-expanded', 'false');
      chev.classList.remove('open');
      this._expanded = false;
      // mark child as collapsed so it can hide its contents
      if (inner && inner.setAttribute) inner.setAttribute('expanded', 'false');
    };

    toggle.onclick = (e) => {
      e.preventDefault();
      (this._expanded ? collapse() : expand());
    };

    // start collapsed
    collapse();
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

customElements.define('expandable-row', ExpandableRow);

export default ExpandableRow;
