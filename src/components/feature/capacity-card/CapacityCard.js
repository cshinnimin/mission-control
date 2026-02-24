/**
 * CapacityCard Web Component (Feature)
 *
 * Usage:
 * <capacity-card data='{"title":"Epic Name"}' open></capacity-card>
 */
class CapacityCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._css = null;
    this._cssLoaded = false;
    this._pendingDataChange = false;
    this._onKeyDown = null;
    this._rows = [];
    this._epicId = '';
  }

  static get observedAttributes() { return ['data', 'open']; }

  attributeChangedCallback() {
    if (!this._cssLoaded) {
      this._pendingDataChange = true;
      return;
    }
    this._syncFromData();
    this._render();
  }

  connectedCallback() {
    this._ensureCss().then(() => {
      this._syncFromData();
      this._render();
    });
    this._onKeyDown = (e) => {
      if (e.key === 'Escape' && this.hasAttribute('open')) {
        this._requestClose('escape');
      }
    };
    document.addEventListener('keydown', this._onKeyDown);
  }

  disconnectedCallback() {
    if (this._onKeyDown) {
      document.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
  }

  async _ensureCss() {
    if (this._cssLoaded) return;
    try {
      const url = new URL('./capacity-card.css', import.meta.url);
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
    const title = parsed.title || '';
    const isEditing = this._rows.some((r) => r.editing);
    const today = new Date().toISOString().split('T')[0];

    this.shadowRoot.innerHTML = `
      <style>${this._css || ''}</style>
      <div class="backdrop" aria-hidden="true"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-label="Capacity Planner">
        <div class="title">${this._escapeHtml(title)}</div>
        <div class="subtitle">Capacity Planner</div>
        <div class="capacity-editor">
          <div class="rows">
            ${this._rows.map((row, index) => {
              if (row.editing) {
                const startValue = row.start || today;
                const endValue = row.end || today;
                return `
                  <div class="row editing" data-index="${index}">
                    <input type="text" class="input name" placeholder="Developer" value="${this._escapeHtml(row.name || '')}" />
                    <input type="date" class="input date start" value="${this._escapeHtml(startValue)}" />
                    <input type="date" class="input date end" value="${this._escapeHtml(endValue)}" />
                    <div class="row-actions">
                      <button type="button" class="row-btn cancel" aria-label="Cancel">X</button>
                      <button type="button" class="row-btn save" aria-label="Save">✓</button>
                    </div>
                  </div>
                `;
              }

              return `
                <div class="row saved" data-index="${index}">
                  <div class="label name">${this._escapeHtml(row.name)}</div>
                  <div class="label date">${this._escapeHtml(row.start)}</div>
                  <div class="label date">${this._escapeHtml(row.end)}</div>
                  <div class="row-actions">
                    <button type="button" class="row-btn delete" aria-label="Delete">X</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          ${isEditing ? '' : `
            <div class="add-row">
              <button type="button" class="capacity-btn add" aria-label="Add capacity row">+</button>
            </div>
          `}
        </div>
        <div class="actions">
          <button type="button" class="btn cancel">Cancel</button>
          <button type="button" class="btn primary ok">OK</button>
        </div>
      </div>
    `;

    const cancelBtn = this.shadowRoot.querySelector('.btn.cancel');
    const okBtn = this.shadowRoot.querySelector('.btn.ok');
    const backdrop = this.shadowRoot.querySelector('.backdrop');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this._requestClose('cancel'));
    }
    if (okBtn) {
      okBtn.addEventListener('click', () => this._saveAllRows());
    }
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    const addBtn = this.shadowRoot.querySelector('.capacity-btn.add');
    if (addBtn) {
      addBtn.addEventListener('click', () => this._startNewRow());
    }

    const rows = this.shadowRoot.querySelectorAll('.row');
    rows.forEach((rowEl) => {
      const index = parseInt(rowEl.getAttribute('data-index'), 10);
      if (Number.isNaN(index)) return;

      if (rowEl.classList.contains('editing')) {
        const cancelBtn = rowEl.querySelector('.row-btn.cancel');
        const saveBtn = rowEl.querySelector('.row-btn.save');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => this._cancelRow(index));
        }
        if (saveBtn) {
          saveBtn.addEventListener('click', () => this._saveRow(index));
        }
      } else {
        const deleteBtn = rowEl.querySelector('.row-btn.delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', () => this._deleteRow(index));
        }
      }
    });
  }

  _startNewRow() {
    const today = new Date().toISOString().split('T')[0];
    this._rows.push({
      name: '',
      start: today,
      end: today,
      editing: true
    });
    this._render();
  }

  _cancelRow(index) {
    const row = this._rows[index];
    if (!row || !row.editing) return;
    this._rows.splice(index, 1);
    this._render();
  }

  _saveRow(index) {
    const row = this._rows[index];
    if (!row || !row.editing) return;

    const rowEl = this.shadowRoot.querySelector(`.row.editing[data-index="${index}"]`);
    if (!rowEl) return;

    const nameInput = rowEl.querySelector('.input.name');
    const startInput = rowEl.querySelector('.input.start');
    const endInput = rowEl.querySelector('.input.end');

    const name = nameInput ? nameInput.value.trim() : '';
    const start = startInput ? startInput.value : '';
    const end = endInput ? endInput.value : '';

    this._rows[index] = {
      name: name || 'Developer',
      start: start || new Date().toISOString().split('T')[0],
      end: end || new Date().toISOString().split('T')[0],
      editing: false
    };
    this._render();
  }

  _deleteRow(index) {
    if (index < 0 || index >= this._rows.length) return;
    this._rows.splice(index, 1);
    this._render();
  }

  _requestClose(action) {
    this.removeAttribute('open');
    this.dispatchEvent(new CustomEvent('capacity-close', {
      detail: { action },
      bubbles: true,
      composed: true
    }));
  }

  _syncFromData() {
    let raw = this.getAttribute('data') || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = {}; }
    const id = parsed.id || '';
    if (id && id !== this._epicId) {
      this._epicId = id;
      this._rows = this._loadRows(id);
    }
  }

  _saveAllRows() {
    const today = new Date().toISOString().split('T')[0];

    const merged = this._rows.map((row, index) => {
      if (!row.editing) return row;

      const rowEl = this.shadowRoot.querySelector(`.row.editing[data-index="${index}"]`);
      if (!rowEl) return row;

      const nameInput = rowEl.querySelector('.input.name');
      const startInput = rowEl.querySelector('.input.start');
      const endInput = rowEl.querySelector('.input.end');

      const name = nameInput ? nameInput.value.trim() : '';
      const start = startInput ? startInput.value : '';
      const end = endInput ? endInput.value : '';

      return {
        name: name || 'Developer',
        start: start || today,
        end: end || today,
        editing: false
      };
    });

    this._rows = merged.map((row) => ({
      name: row.name,
      start: row.start,
      end: row.end,
      editing: false
    }));

    if (this._epicId) {
      try {
        const key = `capacity-card-rows-${this._epicId}`;
        localStorage.setItem(key, JSON.stringify(this._rows));
      } catch (e) {
        console.warn('Failed to save capacity rows to localStorage:', e);
      }
    }

    this._render();
    this._requestClose('ok');
  }

  _loadRows(id) {
    try {
      const key = `capacity-card-rows-${id}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed.map((row) => ({
            name: row.name || 'Developer',
            start: row.start || new Date().toISOString().split('T')[0],
            end: row.end || new Date().toISOString().split('T')[0],
            editing: false
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to load capacity rows from localStorage:', e);
    }
    return [];
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

customElements.define('capacity-card', CapacityCard);

export default CapacityCard;
