/**
 * ExpandableList Web Component
 *
 * Usage:
 * <expandable-list data='{...}' expanded="true"></expandable-list>
 *
 * Expected `data` JSON:
 * {
 *   "column-widths": ["10%","20%","30%",...],
 *   "column-num-lines": [1, 3, 2, ...],
 *   "column-vertical-aligns": ["top", "center", "bottom", ...],
 *   "column-links": ["https://link1", null, "https://link3", ...],
 *   "rows-have-borders": true,
 *   "row-border-colors": ["black","darkgreen",...],
 *   "row-background-colors": ["black","darkgreen",...],
 *   "row-data": [ ["T-01","Build feature","desc","In Progress","High","2026-02-01"], ... ]
 * }
 *
 * For each entry in `row-data` this component will create a <data-row>
 * instance and pass a constructed `data` payload where each column object
 * receives the matching width (from `column-widths`), the matching num-lines
 * (from `column-num-lines`), the matching vertical-align (from `column-vertical-aligns`),
 * the matching link (from `column-links`), and the cell value as `contents`.
 *
 * Options:
 * - column-widths: array of width strings for each column (e.g., "10%", "20px", "auto")
 * - column-num-lines: array of numbers specifying max lines per column (default: 1)
 * - column-vertical-aligns: array of alignment strings ("top", "center", "bottom") per column
 * - column-links: array with one link per ROW (not column) - the link applies to the first
 *   column (typically the ID column). Provide null for rows without links.
 * - rows-have-borders: boolean (default: true) - whether rows should display borders
 * - row-border-colors: array with one color per row for the border
 * - row-background-colors: array with one color per row for the background
 * - row-data: array of arrays, where each inner array represents one row's cell values
 *
 * If `row-border-colors` is provided, each color is forwarded to the corresponding
 * <data-row> as `options.border-color`. The same color is also forwarded as
 * `options.background-color` (unless `row-background-colors` overrides it).
 *
 * Attribute: `expanded` (optional)
 * - If omitted or set to "true" (string), the list is rendered normally.
 * - If set to "false" (string) or "0", the component hides itself and
 *   does not take up any layout space (CSS `display: none`). Default: true.
 */

class ExpandableList extends HTMLElement {
  constructor() {
    super();
    this._css = null;
    this._cssLoaded = false;
    this._pendingDataChange = false;
  }

  static get observedAttributes() { return ['data', 'expanded']; }

  attributeChangedCallback(name, oldV, newV) {
    if ((name === 'data' || name === 'expanded') && oldV !== newV) {
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
      const url = new URL('./expandable-list.css', import.meta.url);
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

    // render start

    const widths = Array.isArray(parsed['column-widths']) ? parsed['column-widths'] : [];
    const numLines = Array.isArray(parsed['column-num-lines']) ? parsed['column-num-lines'] : [];
    const verticalAligns = Array.isArray(parsed['column-vertical-aligns']) ? parsed['column-vertical-aligns'] : [];
    const columnLinks = Array.isArray(parsed['column-links']) ? parsed['column-links'] : [];
    const rowsHaveBorders = typeof parsed['rows-have-borders'] === 'boolean' ? parsed['rows-have-borders'] : true;
    const rows = Array.isArray(parsed['row-data']) ? parsed['row-data'] : [];
    const rowBorderColors = Array.isArray(parsed['row-border-colors']) ? parsed['row-border-colors'] : [];
    const rowBackgroundColors = Array.isArray(parsed['row-background-colors']) ? parsed['row-background-colors'] : [];

    // Determine expanded state (attribute may be "true"/"false" strings)
    const expandedAttr = this.getAttribute('expanded');
    const isExpanded = !(expandedAttr === 'false' || expandedAttr === '0');

    // Build inner HTML containing a series of <data-row> elements
    const rowsHtml = rows.map((row, rowIdx) => {
      // Build columns array expected by DataRow
      const cols = row.map((cell, idx) => {
        const colDef = {
          name: '',
          width: widths[idx] || 'auto',
          contents: String(cell != null ? cell : '')
        };
        // Add num-lines if provided
        if (numLines[idx] != null) {
          colDef['num-lines'] = numLines[idx];
        }
        // Add vertical-align if provided
        if (verticalAligns[idx] != null) {
          colDef['vertical-align'] = verticalAligns[idx];
        }
        // Add link to first column (index 0) if provided for this row
        if (idx === 0 && columnLinks[rowIdx] != null) {
          colDef['link'] = columnLinks[rowIdx];
        }
        return colDef;
      });

      // Determine row border and background colors. Use separate arrays if provided.
      const rowBorderColor = rowBorderColors[rowIdx] || 'black';
      const rowBackgroundColor = rowBackgroundColors[rowIdx] || rowBorderColors[rowIdx] || 'black';

      const payload = {
        options: { 'show-column-names': false, 'has-border': rowsHaveBorders, 'border-color': rowBorderColor, 'background-color': rowBackgroundColor },
        columns: cols
      };

      // JSON stringify with safe escaping for embedding in attribute
      const json = JSON.stringify(payload).replace(/</g, '\u003c');
      return `<data-row data='${json}'></data-row>`;
    }).join('\n');

    // Render a stable wrapper; only populate the inner rows container when expanded.
    const style = this._css ? `<style>${this._css}</style>` : '';
    this.innerHTML = `${style}
      <div class="expandable-list">
        <div class="expandable-rows" aria-hidden="true"></div>
      </div>`;

    const rowsContainer = this.querySelector('.expandable-rows');
    if (!rowsContainer) return;

    if (!isExpanded) {
      // When collapsed, hide the entire host so it occupies no layout space.
      rowsContainer.innerHTML = '';
      rowsContainer.setAttribute('aria-hidden', 'true');
      this.style.display = 'none';
      return;
    }

    // Ensure host is visible before populating to avoid measurement flashes
    this.style.display = '';

    if (isExpanded) {
      // Insert lightweight placeholders first to reserve the layout without
      // instantiating heavy web components that may trigger reflow flashes.
      const placeholderHtml = rows.map(() => `<div class="placeholder"></div>`).join('');
      rowsContainer.innerHTML = placeholderHtml;
      rowsContainer.setAttribute('aria-hidden', 'false');

      // Now create real <data-row> elements and replace placeholders one frame later
      requestAnimationFrame(() => {
        // replace placeholders with data-row elements
        const placeholders = Array.from(rowsContainer.children);
        rows.forEach((row, i) => {
          const el = document.createElement('data-row');
          const cols = row.map((cell, idx) => {
            const colDef = {
              name: '', 
              width: widths[idx] || 'auto', 
              contents: String(cell != null ? cell : '')
            };
            // Add num-lines if provided
            if (numLines[idx] != null) {
              colDef['num-lines'] = numLines[idx];
            }
            // Add vertical-align if provided
            if (verticalAligns[idx] != null) {
              colDef['vertical-align'] = verticalAligns[idx];
            }
            // Add link to first column (index 0) if provided for this row
            if (idx === 0 && columnLinks[i] != null) {
              colDef['link'] = columnLinks[i];
            }
            return colDef;
          });
          const rowBorderColor = rowBorderColors[i] || 'black';
          const rowBackgroundColor = rowBackgroundColors[i] || rowBorderColors[i] || 'black';
          const payload = { options: { 'show-column-names': false, 'has-border': rowsHaveBorders, 'border-color': rowBorderColor, 'background-color': rowBackgroundColor }, columns: cols };
          el.setAttribute('data', JSON.stringify(payload).replace(/</g, '\u003c'));
          // Replace placeholder with real element
          const ph = placeholders[i];
          if (ph && ph.parentNode) ph.parentNode.replaceChild(el, ph);
          else rowsContainer.appendChild(el);
        });
      });
    }
  }
}

customElements.define('expandable-list', ExpandableList);

export default ExpandableList;

