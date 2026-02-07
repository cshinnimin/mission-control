/**
 * ProgressCard Web Component
 *
 * Usage:
 * <progress-card data='{...}'></progress-card>
 *
 * Expected `data` JSON:
 * {
 *   "title": "Card Title 1",
 *   "title-link": "https://example.com",  // optional: URL for title link
 *   "data-row": {
 *     "options": { "show-column-names": true, "has-border": true, ... },
 *     "columns": [
 *       { "name": "Owner", "width": "20%", "contents": "John", "num-lines": 1, "vertical-align": "center" },
 *       ...
 *     ]
 *   },
 *   "progress": 35,                // percent (0-100)
 *   "blocked": 15,                 // percent (0-100)
 *   "projected_completion": "2026-10-05"  // optional: YYYY-MM-DD format
 * }
 *
 * Inputs:
 * - title: string - large title displayed at top of card
 * - title-link: string (optional) - URL for the title link
 * - data-row: object - same schema as `data-row` component with full support for:
 *   - options.show-column-names: show/hide column labels
 *   - options.has-border: show/hide row border
 *   - options.border-color, background-color: styling options
 *   - columns with num-lines and vertical-align settings
 * - progress: number (0-100) - percentage of work completed
 * - blocked: number (0-100) - percentage of work blocked
 * - projected_completion: string (optional) - date in YYYY-MM-DD format
 *
 * Layout:
 * - Large title at top
 * - A `data-row` rendered beneath the title
 * - A rounded progress track showing completed (green) and blocked (red) portions
 * - If projected_completion is provided, displays "Completion: <formatted date>"
 *   below the progress bar, where the date is formatted as "Friday, October 5".
 */
import '../data-row/DataRow.js';

class ProgressCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._css = null;
    this._cssLoaded = false;
    this._pendingDataChange = false;
    this._capacity = 1.00;
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
      const url = new URL('./progress-card.css', import.meta.url);
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
    const titleLink = parsed['title-link'] || '';
    const dataRow = parsed['data-row'] || {};
    const progress = Math.max(0, Math.min(100, Number(parsed.progress) || 0));
    const blocked = Math.max(0, Math.min(100, Number(parsed.blocked) || 0));

    const style = this._css ? `<style>${this._css}</style>` : `<style>:host{display:block}</style>`;
    const id = parsed.id || '';
    const dataIdAttr = id ? ` data-id="${this._escapeHtml(id)}"` : '';
    
    // Load capacity from localStorage if we have an id
    if (id) {
      this._capacity = this._loadCapacity(id);
    }

    // Calculate projected completion if we have the necessary data
    const remainingPoints = parsed.remaining_points;
    const velocity = parsed.velocity;
    const holidays = parsed.holidays || [];
    const projectedCompletion = this._calculateProjectedCompletion(remainingPoints, velocity, holidays, this._capacity);
    const formattedDate = this._formatDate(projectedCompletion);

    // Render title as a link if title-link is provided, otherwise as plain text
    const titleHtml = titleLink 
      ? `<a href="${this._escapeHtml(titleLink)}" class="title-link" target="_blank" rel="noopener noreferrer">${this._escapeHtml(title)}</a>`
      : this._escapeHtml(title);

    // compose inner HTML with a left-side label and bordered progress track
    this.shadowRoot.innerHTML = `
      ${style}
      <div class="card"${dataIdAttr}>
        <div class="title">${titleHtml}</div>
        <div class="data-row-wrap">
          <data-row data='${this._escapeHtml(JSON.stringify(dataRow))}'></data-row>
        </div>
        <div class="progress-row">
          <div class="progress-label">Progress:</div>
          <div class="progress-track" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
            <div class="progress-bar" style="width: ${progress}%;"></div>
            <div class="blocked-bar" style="width: ${blocked}%;"></div>
          </div>
        </div>
        <div class="separator"></div>
        <div class="capacity-row">
          <div class="capacity-label">Capacity:</div>
          <div class="capacity-controls">
            <button class="capacity-btn decrease" aria-label="Decrease capacity">−</button>
            <span class="capacity-value">${this._capacity.toFixed(2)}</span>
            <button class="capacity-btn increase" aria-label="Increase capacity">+</button>
          </div>
        </div>
        ${formattedDate ? `<div class="projected-completion">Completion: ${this._escapeHtml(formattedDate)}</div>` : ''}
      </div>
    `;

    // Attach event listeners to capacity buttons
    this._attachCapacityListeners();
  }

  _attachCapacityListeners() {
    const decreaseBtn = this.shadowRoot.querySelector('.capacity-btn.decrease');
    const increaseBtn = this.shadowRoot.querySelector('.capacity-btn.increase');

    if (decreaseBtn) {
      decreaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._capacity = Math.max(0, this._capacity - 0.25);
        this._updateCapacityDisplay();
        this._saveCapacity();
        this._updateProjectedCompletion();
      });
    }

    if (increaseBtn) {
      increaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._capacity += 0.25;
        this._updateCapacityDisplay();
        this._saveCapacity();
        this._updateProjectedCompletion();
      });
    }
  }

  _updateCapacityDisplay() {
    const valueEl = this.shadowRoot.querySelector('.capacity-value');
    if (valueEl) {
      valueEl.textContent = this._capacity.toFixed(2);
    }
  }

  _updateProjectedCompletion() {
    // Get the current data to access calculation parameters
    let raw = this.getAttribute('data') || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { return; }

    const remainingPoints = parsed.remaining_points;
    const velocity = parsed.velocity;
    const holidays = parsed.holidays || [];

    // Recalculate projected completion
    const projectedCompletion = this._calculateProjectedCompletion(remainingPoints, velocity, holidays, this._capacity);
    const formattedDate = this._formatDate(projectedCompletion);

    // Update only the projected completion element
    const completionEl = this.shadowRoot.querySelector('.projected-completion');
    if (completionEl) {
      if (formattedDate) {
        completionEl.textContent = `Completion: ${formattedDate}`;
        completionEl.style.display = '';
      } else {
        completionEl.style.display = 'none';
      }
    }
  }

  _calculateProjectedCompletion(remainingPoints, velocity, holidays = [], capacity = 1.0) {
    // If capacity is 0, return empty (will show as "Unknown")
    if (capacity === 0) {
      return '';
    }

    // If no velocity provided, don't calculate completion
    if (!velocity || velocity <= 0) {
      return '';
    }

    // If no remaining points, return empty
    if (remainingPoints <= 0) {
      return '';
    }

    // Calculate projected hours needed
    const projectedHours = remainingPoints * velocity;

    // Convert holidays array to Set of Date objects for faster lookup
    const holidaySet = new Set(holidays.map(h => {
      const d = new Date(h + 'T00:00:00');
      return d.toISOString().split('T')[0];
    }));

    // Helper function to check if a date is a business day
    const isBusinessDay = (date) => {
      const dayOfWeek = date.getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false;
      }
      // Check if date is in holidays list
      const dateStr = date.toISOString().split('T')[0];
      return !holidaySet.has(dateStr);
    };

    // Start from NEXT business day from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentDate = new Date(today);
    currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow
    
    // Find the next business day
    while (!isBusinessDay(currentDate)) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Each business day has 8 working hours, multiplied by capacity
    const hoursPerDay = 8 * capacity;
    let remainingHours = projectedHours;

    // Count business days needed
    while (remainingHours > 0) {
      if (isBusinessDay(currentDate)) {
        remainingHours -= hoursPerDay;
      }
      if (remainingHours > 0) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // The completion would fall on currentDate, but we need to display the NEXT business day
    currentDate.setDate(currentDate.getDate() + 1);
    while (!isBusinessDay(currentDate)) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Return in YYYY-MM-DD format
    return currentDate.toISOString().split('T')[0];
  }

  _loadCapacity(id) {
    try {
      const key = `progress-card-capacity-${id}`;
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      // localStorage might not be available
      console.warn('Failed to load capacity from localStorage:', e);
    }
    return 1.00; // default capacity
  }

  _saveCapacity() {
    try {
      let raw = this.getAttribute('data') || '{}';
      let parsed;
      try { parsed = JSON.parse(raw); } catch (e) { parsed = {}; }
      
      const id = parsed.id || '';
      if (id) {
        const key = `progress-card-capacity-${id}`;
        localStorage.setItem(key, this._capacity.toString());
      }
    } catch (e) {
      // localStorage might not be available
      console.warn('Failed to save capacity to localStorage:', e);
    }
  }

  _formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      if (isNaN(date.getTime())) return '';
      
      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    } catch (e) {
      return '';
    }
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

customElements.define('progress-card', ProgressCard);

export default ProgressCard;
