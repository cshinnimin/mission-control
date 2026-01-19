/**
 * MissionControl Web Component (Container)
 *
 * Usage:
 * <mission-control data='{ "epics": [...] }'></mission-control>
 *
 * Expected `data` JSON:
 * {
 *   "epics": [
 *     {
 *       "name": "Some epic name",
 *       "description": "Some epic description",
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
 *       "stories": [
 *         {
 *           "name": "Some story name",
 *           "description": "Some story description",
 *           "status": "IN_PROGRESS",
 *           "jira_status": "In Progress",
 *           "total_tasks": 5,
 *           "tasks_complete": 1,
 *           "tasks_in_progress": 2,
 *           "tasks_blocked": 1,
 *           "total_points": 7,
 *           "points_complete": 2,
 *           "points_in_progress": 3,
 *           "points_blocked": 1,
 *           "tasks": [
 *             {
 *               "name": "Some task name",
 *               "description": "Some task description",
 *               "points": 3,
 *               "status": "IN_PROGRESS",
 *               "jira_status": "In Progress",
 *               "blocked": false
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 *
 * Inputs (via `data` attribute, JSON):
 * - epics: array of epic objects
 *   - name: string - epic name
 *   - description: string - epic description
 *   - status: string - epic status code
 *   - jira_status: string - epic Jira status display
 *   - total_stories: number - total number of stories
 *   - stories_complete: number - number of completed stories
 *   - stories_in_progress: number - number of in-progress stories
 *   - stories_blocked: number - number of blocked stories
 *   - total_points: number - total story points
 *   - points_complete: number - completed story points
 *   - points_in_progress: number - in-progress story points   - points_blocked: number - blocked story points *   - stories: array - detailed story objects (see data sample above)
 *
 * State:
 * - currentView: 'overview' | 'epic-detail' - which view to display
 * - selectedEpic: object | null - the currently selected epic (if any)
 */
import '../mission-control-overview/MissionControlOverview.js';
import '../mission-control-epic-detail/MissionControlEpicDetail.js';

class MissionControl extends HTMLElement {
  constructor() {
    super();
    this._state = {
      currentView: 'overview',
      selectedEpic: null
    };
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

    const { epics = [] } = parsedData;

    // Create container
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';

    // Create overview component (visible on load)
    const overview = document.createElement('mission-control-overview');
    overview.setAttribute('data', JSON.stringify({ epics }));
    overview.style.display = this._state.currentView === 'overview' ? 'block' : 'none';

    // Create epic detail component (hidden on load)
    const epicDetail = document.createElement('mission-control-epic-detail');
    epicDetail.style.display = this._state.currentView === 'epic-detail' ? 'block' : 'none';

    container.appendChild(overview);
    container.appendChild(epicDetail);

    this.innerHTML = '';
    this.appendChild(container);
  }
}

customElements.define('mission-control', MissionControl);
