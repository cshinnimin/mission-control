/**
 * MissionControl Web Component (Container)
 *
 * Usage:
 * <mission-control data='{ "name": "Development Team Mission Control", "epics": [...] }'></mission-control>
 *
 * Expected `data` JSON:
 * {
 *   "name": "Development Team Mission Control",
 *   "epics": [
 *     {
 *       "id": "EPIC-123",
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
 *           "id": "STORY-456",
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
 *               "id": "TASK-789",
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
 * - name: string (optional) - the title to display in the header label above the overview
 * - epics: array of epic objects
 *   - id: string - epic identifier (e.g., "EPIC-123")
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
import '../../presentational/header-label/HeaderLabel.js';
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

  /**
   * Calculate the projected completion date for an epic based on velocity
   * @param {number} remainingPoints - The remaining story points (total - complete)
   * @param {number} velocity - The velocity (points per hour)
   * @param {string[]} holidays - Array of holiday dates in YYYY-MM-DD format
   * @returns {string} - Projected completion date in YYYY-MM-DD format, or empty string if velocity is missing
   */
  calculateProjectedCompletion(remainingPoints, velocity, holidays = []) {
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

    // Each business day has 8 working hours
    const hoursPerDay = 8;
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

  render() {
    const dataAttr = this.getAttribute('data');
    console.log('[MissionControl] render called, data attr:', dataAttr ? 'present' : 'missing');
    if (!dataAttr) {
      this.innerHTML = '<div>No data provided</div>';
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(dataAttr);
      console.log('[MissionControl] parsed data:', { 
        hasName: !!parsedData.name, 
        hasVelocity: !!parsedData.velocity, 
        hasHolidays: !!parsedData.holidays,
        epicCount: parsedData.epics?.length || 0 
      });
    } catch (e) {
      console.error('[MissionControl] JSON parse error:', e);
      this.innerHTML = '<div>Invalid data format</div>';
      return;
    }

    const { name, velocity, holidays = [], epics = [] } = parsedData;

    // Calculate projected_completion for each epic
    const epicsWithCompletion = epics.map(epic => {
      const remainingPoints = epic.total_points - epic.points_complete;
      const projected_completion = this.calculateProjectedCompletion(remainingPoints, velocity, holidays);
      return {
        ...epic,
        projected_completion
      };
    });

    // Create container
    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';

    // Create header label if name is provided
    if (name) {
      const headerLabel = document.createElement('header-label');
      headerLabel.setAttribute('data', JSON.stringify({
        text: name,
        options: {
          'border-color': 'transparent',
          'background-color': 'transparent',
          'size': 'large',
          'alignment': 'center'
        }
      }));
      headerLabel.style.marginBottom = '16px';
      container.appendChild(headerLabel);
    }

    // Create overview component (visible on load)
    const overview = document.createElement('mission-control-overview');
    overview.setAttribute('data', JSON.stringify({ epics: epicsWithCompletion }));
    overview.style.display = this._state.currentView === 'overview' ? 'block' : 'none';
    
    // Listen for epic-selected events
    overview.addEventListener('epic-selected', (e) => {
      this._state.currentView = 'epic-detail';
      // Use the epic with calculated completion
      this._state.selectedEpic = epicsWithCompletion[e.detail.index];
      this.render();
    });

    // Create epic detail component (hidden on load)
    const epicDetail = document.createElement('mission-control-epic-detail');
    epicDetail.style.display = this._state.currentView === 'epic-detail' ? 'block' : 'none';
    
    if (this._state.selectedEpic) {
      epicDetail.setAttribute('data', JSON.stringify({ epic: this._state.selectedEpic }));
    }
    
    // Listen for back navigation from detail view
    epicDetail.addEventListener('back-to-overview', () => {
      this._state.currentView = 'overview';
      this._state.selectedEpic = null;
      this.render();
    });

    container.appendChild(overview);
    container.appendChild(epicDetail);

    this.innerHTML = '';
    this.appendChild(container);
  }
}

customElements.define('mission-control', MissionControl);
