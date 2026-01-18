/**
 * ExpandableRowList Web Component
 *
 * Usage:
 * <expandable-row-list data='[...]'></expandable-row-list>
 *
 * Expects `data` to be an array where each entry is the same payload
 * that an individual <expandable-row> expects (object with `data-row`
 * and `expandable-list` keys).
 */
import '../expandable-row/ExpandableRow.js';

class ExpandableRowList extends HTMLElement {
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

  async _ensureCss() {
    if (this._cssLoaded) return;
    try {
      const url = new URL('./expandable-row-list.css', import.meta.url);
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
    let raw = this.getAttribute('data') || '[]';
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = []; }

    // Accept either a top-level array, or an object with `rows` key.
    const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.rows) ? parsed.rows : []);

    const style = this._css ? `<style>${this._css}</style>` : '';
    const content = rows.map((r) => {
      // stringify each child payload safely for embedding in attribute
      const json = JSON.stringify(r).replace(/</g, '\u003c');
      return `<expandable-row data='${json}'></expandable-row>`;
    }).join('\n');

    this.innerHTML = `${style}
      <div class="expandable-row-list">
        ${content}
      </div>`;
  }
}

customElements.define('expandable-row-list', ExpandableRowList);

export default ExpandableRowList;
