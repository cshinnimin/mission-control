class DataRow extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  static get observedAttributes() {
    return ['data'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'data' && oldValue !== newValue) this.render();
  }

  connectedCallback() {
    this.render();
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

    const style = `
      :host { display: block; box-sizing: border-box; }
      .pill {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 10px 14px;
        border-radius: 9999px;
        background: #f3f4f6;
        color: #111827;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        overflow: hidden;
      }
      .col {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
        padding: 6px 8px;
        border-radius: 8px;
        background: transparent;
      }
      .col .name {
        font-size: 11px;
        opacity: 0.7;
        margin-bottom: 4px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .col .contents {
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;

    const colsHtml = columns.map(col => {
      const width = col.width || 'auto';
      const name = col.name || '';
      const contents = col.contents || '';
      const safeWidth = String(width).trim();
      return `<div class="col" style="flex: 0 0 ${safeWidth}; max-width: ${safeWidth};">
        <div class="name">${this._escapeHtml(name)}</div>
        <div class="contents">${this._escapeHtml(contents)}</div>
      </div>`;
    }).join('');

    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <div class="pill">
        ${colsHtml}
      </div>
    `;
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
