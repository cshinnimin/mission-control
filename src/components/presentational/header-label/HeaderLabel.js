/**
 * HeaderLabel Web Component
 *
 * Usage:
 * <header-label data='{...}'></header-label>
 *
 * Example `data` JSON:
 * {
 *   "text": "This is the label text",
 *   "options": {
 *     "border-color": "black",
 *     "background-color": "transparent",
 *     "size": "medium",
 *     "alignment": "center"
 *   }
 * }
 *
 * Inputs (via `data` attribute, JSON):
 * - text: string - the text content to display in the label
 * - options: (optional) object
 *   - border-color: string (default: "black") - CSS color used for 2px border around the pill
 *   - background-color: string (default: "transparent") - CSS color used for the pill background
 *   - size: string (default: "medium") - text size; "small" (12px), "medium" (24px), or "large" (36px)
 *   - alignment: string (default: "center") - text alignment; "left", "center", or "right"
 *
 * Behavior notes:
 * - Creates a simple pill-shaped label with customizable styling
 * - Text does not wrap; overflowing text is truncated with ellipsis
 * - Displays the full text as a native tooltip on hover (via the `title` attribute)
 */
class HeaderLabel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._css = null;
    this._cssLoaded = false;
    this._pendingDataChange = false;
  }

  static get observedAttributes() {
    return ['data'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'data' && oldValue !== newValue) {
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
      const url = new URL('./header-label.css', import.meta.url);
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
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = {};
    }

    const text = parsed.text || '';
    const options = parsed.options || {};
    const borderColor = options['border-color'] || 'black';
    const backgroundColor = options['background-color'] || 'transparent';
    const size = options.size || 'medium';
    const alignment = options.alignment || 'center';

    // Map size to font-size
    let fontSize = '24px';
    if (size === 'small') {
      fontSize = '12px';
    } else if (size === 'large') {
      fontSize = '36px';
    }

    // Map alignment to text-align
    let textAlign = 'center';
    if (alignment === 'left') {
      textAlign = 'left';
    } else if (alignment === 'right') {
      textAlign = 'right';
    }

    const style = this._css
      ? `<style>${this._css}</style>`
      : `<style>:host{display:block}</style>`;

    this.shadowRoot.innerHTML = `
      ${style}
      <div class="pill" 
           style="border: 2px solid ${borderColor}; background-color: ${backgroundColor};"
           title="${text}">
        <div class="label-text" style="font-size: ${fontSize}; text-align: ${textAlign};">
          ${text}
        </div>
      </div>
    `;
  }
}

customElements.define('header-label', HeaderLabel);

export default HeaderLabel;
