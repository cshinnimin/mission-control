/**
 * ExpandableList Web Component
 *
 * Usage:
 * <expandable-list data='{...}' expanded="true"></expandable-list>
 *
 * Expected `data` JSON shape (for now):
 * {
 *   "column-widths": ["10%","20%",...],
 *   "row-border-colors": ["black","black",...],
 *   "row-data": [ ["T-01","Build feature","desc","In Progress","High","2026-02-01"], ... ]
 * }
 *
 * For each entry in `row-data` this component will create a <data-row>
 * instance and pass a constructed `data` payload where each column object
 * receives the matching width (from `column-widths`) and the cell value as
 * `contents`.
 *
 * Additionally, if `row-border-colors` is provided it should be a single
 * array with one color per row. Each color will be forwarded into the
 * corresponding <data-row> payload as `options.border-color` so the row
 * component can apply the desired border color.
 *
 * Attribute: `expanded` (optional)
 * - If omitted or set to "true" (string), the list is rendered normally.
 * - If set to "false" (string) or "0", the component hides itself and
 *   does not take up any layout space (CSS `display: none`). Default: true.
 */

class ExpandableList extends HTMLElement {
  constructor() {
    super();
  }

  static get observedAttributes() { return ['data', 'expanded']; }

  attributeChangedCallback(name, oldV, newV) {
    if ((name === 'data' || name === 'expanded') && oldV !== newV) this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    let raw = this.getAttribute('data') || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = {}; }

    const widths = Array.isArray(parsed['column-widths']) ? parsed['column-widths'] : [];
    const rows = Array.isArray(parsed['row-data']) ? parsed['row-data'] : [];
    const rowBorderColors = Array.isArray(parsed['row-border-colors']) ? parsed['row-border-colors'] : [];

    // Determine expanded state (attribute may be "true"/"false" strings)
    const expandedAttr = this.getAttribute('expanded');
    const isExpanded = !(expandedAttr === 'false' || expandedAttr === '0');

    // Build inner HTML containing a series of <data-row> elements
    const rowsHtml = rows.map((row, rowIdx) => {
      // Build columns array expected by DataRow
      const cols = row.map((cell, idx) => {
        return {
          name: '',
          width: widths[idx] || 'auto',
          contents: String(cell != null ? cell : '')
        };
      });

      // Determine row border color (single value per row). Default to black.
      const rowColor = rowBorderColors[rowIdx] || 'black';

      const payload = {
        options: { show_column_names: false, 'border-color': rowColor },
        columns: cols
      };

      // JSON stringify with safe escaping for embedding in attribute
      const json = JSON.stringify(payload).replace(/</g, '\u003c');
      return `<data-row data='${json}'></data-row>`;
    }).join('\n');

    // Render simple static wrapper (no animation)
    this.innerHTML = `<div class="expandable-list" style="background: #f3f4f6; padding: 8px; border-radius: 16px; box-sizing: border-box;">${rowsHtml}</div>`;

    const container = this.querySelector('.expandable-list');
    if (!container) return;

    // Simple expanded behavior: show or hide immediately without transitions
    if (isExpanded) {
      this.style.display = '';
    } else {
      this.style.display = 'none';
    }
  }
}

customElements.define('expandable-list', ExpandableList);

export default ExpandableList;
