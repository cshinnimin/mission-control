/**
 * MissionControlOverview Web Component (Container)
 *
 * Usage:
 * <mission-control-overview data='{ "epics": [...], "velocity": 2.5, "holidays": [...] }'></mission-control-overview>
 *
 * Expected `data` JSON:
 * {
 *   "velocity": 2.5,
 *   "holidays": ["2026-01-01", "2026-12-25"],
 *   "epics": [
 *     {
 *       "id": "EPIC-123",
 *       "name": "Some epic name",
 *       "description": "Some epic description",
 *       "owner": "Jane Doe",
 *       "status": "IN_PROGRESS",
 *       "jira_status": "In Progress",
 *       "total_stories": 12,
 *       "stories_complete": 4,
 *       "stories_in_progress": 5,
 *       "stories_blocked": 1,
 *       "total_points": 39,
 *       "points_complete": 13,
 *       "points_in_progress": 11,
 *       "points_blocked": 2,
 *       "stories": [...]
 *     }
 *   ]
 * }
 *
 * Inputs (via `data` attribute, JSON):
 * - velocity: number (optional) - velocity in hours per point for projected completion calculation
 * - holidays: array of strings (optional) - holiday dates in YYYY-MM-DD format
 * - epics: array of epic objects
 *   - id: string - epic identifier (e.g., "EPIC-123")
 *   - name: string - epic name (used as card title)
 *   - jira_status: string - epic Jira status (displayed as "Status")
 *   - total_stories: number - total number of stories
 *   - stories_complete: number - number of completed stories
   - stories_blocked: number - number of blocked stories
   - total_points: number - total story points
   - points_complete: number - completed story points
   - points_blocked: number - blocked story points
 *
 * Behavior:
 * - Creates a progress-card-grid with one card per epic
 * - Each card shows a data-row with Status, Stories, Completed, and Blocked columns
 * - Progress is calculated as (points_complete / total_points) * 100
 * - Projected completion date is calculated based on remaining points, velocity, and holidays
 */
import '../../presentational/progress-card-grid/ProgressCardGrid.js';
import '../../presentational/data-row/DataRow.js';

class MissionControlOverview extends HTMLElement {
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
      this.innerHTML = '<div>No data provided</div>';
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(dataAttr);
    } catch (e) {
      this.innerHTML = '<div>Invalid data format</div>';
      return;
    }

    const { velocity, holidays = [], epics = [] } = parsedData;

    // Build progress cards data
    const progressCards = epics.map(epic => {
      const progress = epic.total_points > 0 
        ? (epic.points_complete / epic.total_points) * 100 
        : 0;
      const blocked = epic.total_points > 0
        ? (epic.points_blocked / epic.total_points) * 100
        : 0;

      return {
        id: epic.id,
        title: epic.name,
        progress: progress,
        blocked: blocked,
        remaining_points: epic.total_points - epic.points_complete,
        velocity: velocity,
        holidays: holidays,
        "data-row": {
          options: {
            "show-column-names": true,
            "border-color": "transparent",
            "background-color": "transparent"
          },
          columns: [
            {
              name: "Status",
              width: "45%",
              contents: epic.jira_status
            },
            {
              name: "Stories",
              width: "20%",
              contents: String(epic.total_stories)
            },
            {
              name: "Completed",
              width: "20%",
              contents: String(epic.stories_complete)
            },
            {
              name: "Blocked",
              width: "15%",
              contents: String(epic.stories_blocked)
            }
          ]
        }
      };
    });

    // Create progress-card-grid
    const cardGrid = document.createElement('progress-card-grid');
    cardGrid.setAttribute('data', JSON.stringify({ "progress-cards": progressCards }));
    
    // Listen for card-click events and re-dispatch with epic data
    cardGrid.addEventListener('card-click', (e) => {
      const index = e.detail.index;
      this.dispatchEvent(new CustomEvent('epic-selected', {
        detail: { 
          index: index,
          epic: epics[index],
          velocity: velocity,
          holidays: holidays
        },
        bubbles: true,
        composed: true
      }));
    });

    this.innerHTML = '';
    this.appendChild(cardGrid);
  }
}

customElements.define('mission-control-overview', MissionControlOverview);
