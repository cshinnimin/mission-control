/**
 * MissionControlEpicDetail Web Component (Container)
 *
 * Usage:
 * <mission-control-epic-detail data='{ "epic": {...} }'></mission-control-epic-detail>
 *
 * Expected `data` JSON:
 * {
 *   "epic": {
 *     "name": "Some epic name",
 *     "description": "Some epic description",
 *     "status": "IN_PROGRESS",
 *     "jira_status": "In Progress",
 *     "total_stories": 12,
 *     "stories_complete": 4,
 *     "stories_in_progress": 5,
 *     "stories_blocked": 1,
 *     "total_points": 39,
 *     "points_complete": 13,
 *     "points_in_progress": 11,
 *     "points_blocked": 2,
 *     "stories": [...]
 *   }
 * }
 *
 * Inputs (via `data` attribute, JSON):
 * - epic: object - epic details (structure to be determined)
 *
 * Note: This is a placeholder component. Full implementation pending.
 */

class MissionControlEpicDetail extends HTMLElement {
  constructor() {
    super();
  }

  static get observedAttributes() { return ['data']; }

  attributeChangedCallback(name, oldV, newV) {
    if (name === 'data' && oldV !== newV) {
      this.render();
    }
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const dataAttr = this.getAttribute('data');
    if (!dataAttr) {
      this.innerHTML = '<div>Epic Detail - No data provided</div>';
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(dataAttr);
    } catch (e) {
      this.innerHTML = '<div>Epic Detail - Invalid data format</div>';
      return;
    }

    // Placeholder implementation
    const { epic } = parsedData;
    const container = document.createElement('div');
    container.style.padding = '20px';
    container.innerHTML = `
      <h2>Epic Detail (Placeholder)</h2>
      <p>Epic: ${epic?.name || 'Unknown'}</p>
      <p>This component will be implemented later.</p>
    `;

    this.innerHTML = '';
    this.appendChild(container);
  }
}

customElements.define('mission-control-epic-detail', MissionControlEpicDetail);
