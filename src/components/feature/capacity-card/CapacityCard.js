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
    this._targetCompletion = '';
    this._holidays = [];
    this._updateFeedbackTimer = null;
    this._showUpdateFeedback = false;
  }

  static get observedAttributes() { return ['data', 'open']; }

  attributeChangedCallback() {
    if (!this._cssLoaded) {
      this._pendingDataChange = true;
      return;
    }
    this._syncFromData();
    if (this.hasAttribute('open')) {
      this._reloadFromStorage();
    }
    this._render();
  }

  connectedCallback() {
    this._ensureCss().then(() => {
      this._syncFromData();
      if (this.hasAttribute('open')) {
        this._reloadFromStorage();
      }
      this._render();
    });
    this._onKeyDown = (e) => {
      if (e.key === 'Escape' && this.hasAttribute('open')) {
        this._discardChangesAndClose('escape');
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
    const hasRowError = this._rows.some((r) => r && r.error === 'required');
    const today = new Date().toISOString().split('T')[0];
    const targetCompletion = this._targetCompletion || today;
    const capacityValue = this._calculateCapacityValue(today, targetCompletion, this._rows, this._holidays);
    const capacityLabel = capacityValue == null ? 'Capacity: TBD' : `Capacity: ${capacityValue}`;

    this.shadowRoot.innerHTML = `
      <style>${this._css || ''}</style>
      <div class="backdrop" aria-hidden="true"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-label="Capacity Planner">
        <div class="title">${this._escapeHtml(title)}</div>
        <div class="subtitle">Capacity Planner</div>
        <div class="target-row">
          <label class="target-label" for="capacity-target-date">Target Completion:</label>
          <input type="date" id="capacity-target-date" class="input date target" value="${this._escapeHtml(targetCompletion)}" />
        </div>
        <div class="capacity-editor${hasRowError ? ' has-error' : ''}">
          <div class="rows">
            ${this._rows.map((row, index) => {
              if (row.editing) {
                const startValue = row.start || today;
                const endValue = row.end || today;
                const isWarning = this._isAfterDate(endValue, targetCompletion);
                const hasError = row.error === 'required';
                return `
                  <div class="row editing" data-index="${index}">
                    <div class="field-group">
                      <input type="text" class="input name${hasError ? ' error' : ''}" placeholder="Developer" value="${this._escapeHtml(row.name || '')}" />
                      ${hasError ? '<div class="field-error">Required</div>' : ''}
                    </div>
                    <input type="date" class="input date start" value="${this._escapeHtml(startValue)}" />
                    <input type="date" class="input date end${isWarning ? ' warning' : ''}" ${isWarning ? 'title="Dates past target completion ignored"' : ''} value="${this._escapeHtml(endValue)}" />
                    <div class="row-actions">
                      <button type="button" class="row-btn cancel" aria-label="Cancel">X</button>
                      <button type="button" class="row-btn save" aria-label="Save">✓</button>
                    </div>
                  </div>
                `;
              }

              const isWarning = this._isAfterDate(row.end, targetCompletion);
              return `
                <div class="row saved" data-index="${index}">
                  <div class="label name">${this._escapeHtml(row.name)}</div>
                  <div class="label date">${this._escapeHtml(row.start)}</div>
                  <div class="label date${isWarning ? ' warning' : ''}" ${isWarning ? 'title="Dates past target completion ignored"' : ''}>${this._escapeHtml(row.end)}</div>
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
        <div class="capacity-summary">${this._escapeHtml(capacityLabel)}</div>
        <div class="actions">
          <button type="button" class="btn update">Update Capacity</button>
          <span class="update-feedback" aria-live="polite">${this._showUpdateFeedback ? '✓' : ''}</span>
          <button type="button" class="btn cancel">Cancel</button>
          <button type="button" class="btn primary ok">Save</button>
        </div>
      </div>
    `;

    const cancelBtn = this.shadowRoot.querySelector('.btn.cancel');
    const okBtn = this.shadowRoot.querySelector('.btn.ok');
    const updateBtn = this.shadowRoot.querySelector('.btn.update');
    const backdrop = this.shadowRoot.querySelector('.backdrop');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this._discardChangesAndClose('cancel'));
    }
    if (okBtn) {
      okBtn.addEventListener('click', () => this._saveAllRows());
    }
    if (updateBtn) {
      updateBtn.addEventListener('click', () => this._updateCapacity());
    }
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
    }

    const targetInput = this.shadowRoot.querySelector('.input.date.target');
    if (targetInput) {
      targetInput.addEventListener('change', () => {
        this._targetCompletion = targetInput.value;
        this._updateCapacitySummary();
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
      editing: true,
      error: null
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

    if (!name) {
      this._rows[index] = {
        ...row,
        error: 'required'
      };
      this._render();
      return;
    }

    this._rows[index] = {
      name: name,
      start: start || new Date().toISOString().split('T')[0],
      end: end || new Date().toISOString().split('T')[0],
      editing: false,
      error: null
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

  _discardChangesAndClose(action) {
    this._reloadFromStorage();
    this._render();
    this._requestClose(action);
  }

  _syncFromData() {
    let raw = this.getAttribute('data') || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = {}; }
    const id = parsed.id || '';
    const holidays = Array.isArray(parsed.holidays) ? parsed.holidays : [];
    this._holidays = holidays;
    if (id) {
      this._epicId = id;
    }
  }

  _reloadFromStorage() {
    if (!this._epicId) return;
    const loaded = this._loadRows(this._epicId);
    this._rows = loaded.rows;
    this._targetCompletion = loaded.targetCompletion;
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

    const targetInput = this.shadowRoot.querySelector('.input.date.target');
    const targetValue = targetInput ? targetInput.value : today;
    this._targetCompletion = targetValue || today;

    if (this._epicId) {
      try {
        const rowsKey = `capacity-card-rows-${this._epicId}`;
        localStorage.setItem(rowsKey, JSON.stringify(this._rows));
        const targetKey = `capacity-card-target-${this._epicId}`;
        localStorage.setItem(targetKey, this._targetCompletion);
      } catch (e) {
        console.warn('Failed to save capacity rows to localStorage:', e);
      }
    }

    this._render();
    this._requestClose('ok');
  }

  _updateCapacity() {
    const today = new Date().toISOString().split('T')[0];
    const target = this._targetCompletion || today;
    const capacityValue = this._calculateCapacityValue(today, target, this._rows, this._holidays);

    if (capacityValue != null && this._epicId) {
      this.dispatchEvent(new CustomEvent('capacity-updated', {
        detail: {
          id: this._epicId,
          capacity: Number(capacityValue)
        },
        bubbles: true,
        composed: true
      }));
    }

    this._showUpdateFeedback = true;
    if (this._updateFeedbackTimer) {
      clearTimeout(this._updateFeedbackTimer);
    }
    this._updateFeedbackTimer = setTimeout(() => {
      this._showUpdateFeedback = false;
      const feedbackEl = this.shadowRoot.querySelector('.update-feedback');
      if (feedbackEl) feedbackEl.textContent = '';
    }, 900);
    const feedbackEl = this.shadowRoot.querySelector('.update-feedback');
    if (feedbackEl) feedbackEl.textContent = '✓';
  }

  _loadRows(id) {
    try {
      const key = `capacity-card-rows-${id}`;
      const stored = localStorage.getItem(key);
      const targetKey = `capacity-card-target-${id}`;
      const targetStored = localStorage.getItem(targetKey);
      const today = new Date().toISOString().split('T')[0];
      const targetCompletion = targetStored || today;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return {
            rows: parsed.map((row) => ({
              name: row.name || 'Developer',
              start: row.start || today,
              end: row.end || today,
              editing: false
            })),
            targetCompletion
          };
        }
      }
      return { rows: [], targetCompletion };
    } catch (e) {
      console.warn('Failed to load capacity rows from localStorage:', e);
    }
    return { rows: [], targetCompletion: new Date().toISOString().split('T')[0] };
  }

  _calculateCapacityValue(todayStr, targetStr, rows, holidays = []) {
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const holidaySet = new Set((holidays || []).map((h) => this._normalizeDateStr(h)).filter(Boolean));
    const remainingDays = this._countBusinessDaysAfter(todayStr, targetStr, holidaySet);
    if (!remainingDays) return null;

    const developerDays = rows.reduce((sum, row) => {
      if (!row || row.editing) return sum;
      const start = this._maxDateStr(todayStr, row.start);
      const end = this._minDateStr(targetStr, row.end);
      if (!start || !end) return sum;
      const days = this._countBusinessDaysAfter(start, end, holidaySet);
      return sum + days;
    }, 0);

    const value = developerDays / remainingDays;
    if (!isFinite(value)) return null;
    return value.toFixed(2);
  }

  _updateCapacitySummary() {
    const today = new Date().toISOString().split('T')[0];
    const target = this._targetCompletion || today;
    const capacityValue = this._calculateCapacityValue(today, target, this._rows, this._holidays);
    const label = capacityValue == null ? 'Capacity: TBD' : `Capacity: ${capacityValue}`;
    const summaryEl = this.shadowRoot.querySelector('.capacity-summary');
    if (summaryEl) summaryEl.textContent = label;
  }

  _countBusinessDaysAfter(startStr, endStr, holidaySet) {
    const startDate = this._dateFromStr(startStr);
    const endDate = this._dateFromStr(endStr);
    if (!startDate || !endDate) return 0;
    if (endDate < startDate) return 0;

    let current = new Date(startDate);
    current.setDate(current.getDate() + 1);

    let count = 0;
    while (current <= endDate) {
      if (this._isBusinessDay(current, holidaySet)) count += 1;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  _isBusinessDay(date, holidaySet) {
    const day = date.getDay();
    if (day === 0 || day === 6) return false;
    const dateStr = date.toISOString().split('T')[0];
    return !holidaySet.has(dateStr);
  }

  _dateFromStr(str) {
    if (!str) return null;
    const date = new Date(str + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  }

  _normalizeDateStr(str) {
    const date = this._dateFromStr(str);
    return date ? date.toISOString().split('T')[0] : '';
  }

  _maxDateStr(a, b) {
    const da = this._dateFromStr(a);
    const db = this._dateFromStr(b);
    if (!da && !db) return '';
    if (!da) return b;
    if (!db) return a;
    return da >= db ? a : b;
  }

  _minDateStr(a, b) {
    const da = this._dateFromStr(a);
    const db = this._dateFromStr(b);
    if (!da && !db) return '';
    if (!da) return b;
    if (!db) return a;
    return da <= db ? a : b;
  }

  _isAfterDate(dateStr, targetStr) {
    const d = this._dateFromStr(dateStr);
    const t = this._dateFromStr(targetStr);
    if (!d || !t) return false;
    return d > t;
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
