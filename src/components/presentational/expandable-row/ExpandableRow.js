/**
 * ExpandableRow Web Component
 *
 * Usage:
 * <expandable-row data='{data}'></expandable-row>
 *
 * Expects `data` JSON with two top-level keys: `data-row` and `expandable-list`.
 * - `data-row`: object compatible with the existing `data-row` component
 * - `expandable-list`: object compatible with `expandable-list` component
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
    this._css = `:host{display:block;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif}
.container{border-radius:8px;padding:8px;background:#fff;border:1px solid #ddd}
.top{display:flex;align-items:center}
.main{flex:1;min-width:0}
.toggle{width:36px;height:36px;border-radius:6px;border:none;background:#f0f0f0;display:flex;align-items:center;justify-content:center;cursor:pointer}
.toggle:active{transform:scale(.98)}
.chev{transition:transform .2s ease}
.chev.open{transform:rotate(180deg)}
.list{overflow:hidden;transition:max-height .28s ease;padding-top:8px}
`;
    this._expanded = false;
  }

  static get observedAttributes() { return ['data']; }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'data' && oldVal !== newVal) this._render();
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    let raw = this.getAttribute('data') || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = {}; }

    const dataRow = parsed['data-row'] || {};
    const listData = parsed['expandable-list'] || {};

    // Compose inner HTML - include css + structure
    this.shadowRoot.innerHTML = `
      <style>${this._css}</style>
      <div class="container">
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
