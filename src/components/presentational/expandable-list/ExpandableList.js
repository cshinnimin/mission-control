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

    // render start

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

    // Render a stable wrapper; only populate the inner rows container when expanded.
    this.innerHTML = `
      <div class="expandable-list" style="background: #f3f4f6; padding: 8px; border-radius: 16px; box-sizing: border-box;">
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
      const placeholderHtml = rows.map(() => `<div style="height:56px; margin-bottom:12px; background:transparent;"></div>`).join('');
      rowsContainer.innerHTML = placeholderHtml;
      rowsContainer.setAttribute('aria-hidden', 'false');

      // Now create real <data-row> elements and replace placeholders one frame later
      requestAnimationFrame(() => {
        // replace placeholders with data-row elements
        const placeholders = Array.from(rowsContainer.children);
        rows.forEach((row, i) => {
          const el = document.createElement('data-row');
          const cols = row.map((cell, idx) => ({ name: '', width: widths[idx] || 'auto', contents: String(cell != null ? cell : '') }));
          const rowColor = rowBorderColors[i] || 'black';
          const payload = { options: { show_column_names: false, 'border-color': rowColor }, columns: cols };
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
