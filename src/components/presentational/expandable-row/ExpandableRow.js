/**
 * ExpandableRow Web Component
 *
 * Usage:
 * <expandable-row data='{data}'></expandable-row>
 * 
 * Example `data` JSON:
 * {
 *   "data-row": {
 *     "options": { "show-column-names": true, "has-border": true, "border-color": "black" },
 *     "columns": [
 *       { "name": "ID", "width": "10%", "contents": "STORY-123", "num-lines": 1, "vertical-align": "center", "link": "https://example.com/STORY-123" },
 *       { "name": "Name", "width": "30%", "contents": "Story name", "num-lines": 2, "vertical-align": "top" }
 *     ]
 *   },
 *   "expandable-list": {
 *     "column-widths": ["10%", "30%", "40%", "10%", "10%"],
 *     "column-num-lines": [1, 3, 3, 1, 1],
 *     "column-vertical-aligns": ["top", "top", "top", "center", "center"],
 *     "column-links": ["https://example.com/task1", "https://example.com/task2", null],
 *     "rows-have-borders": false,
 *     "row-data": [ ["T-01", "Task name", "Task desc", "In Progress", "3"] ]
 *   },
 *   "options": {
 *     "border-color": "black",
 *     "background-color": "transparent",
 *     "detail-rows-have-borders": false
 *   }
 * }
 *
 * Inputs (via `data` attribute, JSON):
 * - data-row: object - Configuration for the main row (compatible with `data-row` component)
 *   - options.show-column-names: whether to show column name labels
 *   - options.has-border: whether the main row has a border
 *   - options.border-color: color of the main row border
 *   - columns: array of column objects
 *     - name, width, contents: standard column properties
 *     - num-lines: max lines before truncation (default: 1)
 *     - vertical-align: "top", "center", or "bottom" (default: "center")
 *     - link: (optional) URL to make the column contents a hyperlink (opens in new tab)
 * 
 * - expandable-list: object - Configuration for the detail rows (compatible with `expandable-list` component)
 *   - column-widths: array of width strings
 *   - column-num-lines: array of max lines per column
 *   - column-vertical-aligns: array of alignment strings per column
 *   - column-links: (optional) array with one link per ROW (applied to first column of each row)
 *   - rows-have-borders: whether detail rows show borders (controlled by detail-rows-have-borders option)
 *   - row-data: array of arrays with cell values
 *   - row-border-colors: optional array of border colors per row
 *   - row-background-colors: optional array of background colors per row
 * 
 * - options: (optional) object
 *   - border-color: string (default: "#777") - CSS color for the container border around the expandable row
 *   - background-color: string (optional) - CSS color for container background
 *   - detail-rows-have-borders: boolean (default: true) - whether the detail rows (expandable-list) display borders.
 *     This is passed through as `rows-have-borders` to the expandable-list component.
 *   - show-detail-section-border: boolean (default: false) - whether to show a dotted border around the
 *     expanded detail section (3 sides: left, right, bottom)
 *
 * Layout:
 * - Rounded container with a top row containing the `data-row` and an expand/collapse button
 * - The `expandable-list` is rendered underneath and collapsed by default
 * - The main row always has its configured border; detail rows can optionally hide borders via detail-rows-have-borders
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
    const detailRowsHaveBorders = typeof options['detail-rows-have-borders'] === 'boolean' ? options['detail-rows-have-borders'] : true;
    const showDetailSectionBorder = typeof options['show-detail-section-border'] === 'boolean' ? options['show-detail-section-border'] : false;
    
    // Pass detail-rows-have-borders to the expandable-list as rows-have-borders
    const listDataWithBorders = Object.assign({}, listData, { 'rows-have-borders': detailRowsHaveBorders });

    // Compose inner HTML - include css + structure
    const style = this._css ? `<style>${this._css}</style>` : `<style>:host{display:block}</style>`;
    const listClass = showDetailSectionBorder ? 'list show-border' : 'list';
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
        <div class="${listClass}" style="max-height:0">
          <expandable-list data='${this._escapeHtml(JSON.stringify(listDataWithBorders))}'></expandable-list>
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
        listEl.classList.add('expanded');
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
      listEl.classList.remove('expanded');
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
