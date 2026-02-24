/**
 * MissionControlEpicDetail Web Component (Container)
 *
 * Usage:
 * <mission-control-epic-detail data='{ "epic": {...} }'></mission-control-epic-detail>
 *
 * Expected `data` JSON:
 * {
 *   "epic": {
 *     "id": "EPIC-123",
 *     "name": "Some epic name",
 *     "description": "Some epic description",
 *     "owner": "Jane Doe",
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
 *     "projected_completion": "2026-02-15",
 *     "stories": [
 *       {
 *         "id": "STORY-456",
 *         "name": "Story name",
 *         "description": "Story description",
 *         "status": "IN_PROGRESS",
 *         "points": 7,
 *         "tasks": [
 *           {
 *             "id": "TASK-789",
 *             "name": "Task name",
 *             "description": "Task description",
 *             "status": "IN_PROGRESS",
 *             "points": 3
 *           }
 *         ]
 *       }
 *     ]
 *   }
 * }
 *
 * Inputs (via `data` attribute, JSON):
 * - epic: object - epic details
 *   - id: string - epic identifier (e.g., "EPIC-123")
 *   - link: string (optional) - URL for the epic (if provided, epic card may link to it)
 *   - stories: array of story objects
 *     - id: string - story identifier (e.g., "STORY-456")
 *     - link: string (optional) - URL for the story (renders ID column as hyperlink)
 *     - tasks: array of task objects
 *       - id: string - task identifier (e.g., "TASK-789")
 *       - link: string (optional) - URL for the task (renders ID column as hyperlink)
 *
 * Layout:
 * - Single progress-card at top showing epic summary
 * - Expandable-row-list below with one row per story
 * - Each story row contains tasks in an expandable-list
 * - Story background color depends on status:
 *   - IN_PROGRESS: darkgreen
 *   - COMPLETE: darkblue
 *   - BLOCKED: darkred
 */
import '../../feature/progress-card/ProgressCard.js';
import '../../presentational/expandable-row-list/ExpandableRowList.js';
import '../../feature/capacity-card/CapacityCard.js';

// Status color constants for easier maintenance
const STORY_STATUS_COLORS = {
  IN_PROGRESS: 'darkgreen',
  COMPLETE: 'darkblue',
  BLOCKED: 'darkred'
};

class MissionControlEpicDetail extends HTMLElement {
  constructor() {
    super();
    this._progressCard = null;
    this._currentEpicId = '';
    this._capacityCard = null;
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

    const { epic, velocity, holidays = [] } = parsedData;
    if (!epic) {
      this.innerHTML = '<div>Epic Detail - No epic data provided</div>';
      return;
    }

    const container = document.createElement('div');
    container.style.boxSizing = 'border-box';
    container.style.width = '100%';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '20px';
    container.style.padding = '20px';
    // Use detail font for better readability
    container.style.fontFamily = 'var(--detail-font)';

    // Create back button
    const backButton = document.createElement('button');
    backButton.textContent = '← Back to Overview';
    backButton.style.alignSelf = 'flex-start';
    backButton.style.padding = '8px 16px';
    backButton.style.cursor = 'pointer';
    backButton.style.fontSize = '14px';
    backButton.style.border = '1px solid #ccc';
    backButton.style.borderRadius = '4px';
    backButton.style.backgroundColor = '#f5f5f5';
    backButton.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('back-to-overview', {
        bubbles: true,
        composed: true
      }));
    });
    container.appendChild(backButton);

    // Create progress card for the epic
    const progress = epic.total_points > 0 
      ? (epic.points_complete / epic.total_points) * 100 
      : 0;
    const blocked = epic.total_points > 0
      ? (epic.points_blocked / epic.total_points) * 100
      : 0;
    const percentComplete = Math.round(progress);

    const capacity = this._loadCapacity(epic.id);
    const progressCardData = {
      id: epic.id,
      title: epic.name,
      "title-link": epic.link || '',
      capacity: capacity,
      progress: progress,
      blocked: blocked,
      remaining_points: epic.total_points - epic.points_complete,
      velocity: velocity,
      holidays: holidays,
      "data-row": {
        options: {
          "show-column-names": true,
          "border-color": "transparent",
          "background-color": epic.stories_blocked > 0 ? "rgba(139, 0, 0, 0.12)" : (epic.status === "IN_PROGRESS" ? "rgba(0, 100, 0, 0.12)" : (epic.status === "COMPLETE" ? "rgba(0, 0, 139, 0.12)" : "transparent"))
        },
        columns: [
          {
            name: "Owner",
            width: "20%",
            contents: epic.owner || "Unassigned"
          },
          {
            name: "Status",
            width: "20%",
            contents: epic.jira_status || ""
          },
          {
            name: "Stories",
            width: "10%",
            contents: String(epic.total_stories || 0)
          },
          {
            name: "Completed",
            width: "10%",
            contents: String(epic.stories_complete || 0)
          },
          {
            name: "Blocked",
            width: "10%",
            contents: String(epic.stories_blocked || 0)
          },
          {
            name: "Total Points",
            width: "10%",
            contents: String(epic.total_points || 0)
          },
          {
            name: "Completed Points",
            width: "10%",
            contents: String(epic.points_complete || 0)
          },
          {
            name: "% Complete",
            width: "10%",
            contents: `${percentComplete}%`
          }
        ]
      }
    };

    const progressCard = document.createElement('progress-card');
    progressCard.setAttribute('data', JSON.stringify(progressCardData));
    if (epic.id) {
      progressCard.setAttribute('data-id', epic.id);
    }
    // Keep global font for the ProgressCard
    progressCard.style.fontFamily = 'var(--global-font)';
    progressCard.addEventListener('capacity-click', (e) => {
      const title = e.detail && e.detail.title ? e.detail.title : '';
      const id = e.detail && e.detail.id ? e.detail.id : '';
      this._openCapacityModal(title, id, holidays || []);
    });
    progressCard.addEventListener('capacity-change', (e) => {
      const id = e.detail && e.detail.id ? e.detail.id : '';
      const value = e.detail && typeof e.detail.capacity === 'number' ? e.detail.capacity : null;
      if (!id || value == null) return;
      this._persistCapacity(id, value);
      this.applyCapacityUpdate(id, value);
      this.dispatchEvent(new CustomEvent('capacity-updated', {
        detail: { id, capacity: value },
        bubbles: true,
        composed: true
      }));
    });
    container.appendChild(progressCard);
    this._progressCard = progressCard;
    this._currentEpicId = epic.id || '';

    this._capacityCard = document.createElement('capacity-card');
    this._capacityCard.addEventListener('capacity-close', () => {
      this._closeCapacityModal();
    });
    this._capacityCard.addEventListener('capacity-updated', (e) => {
      const id = e.detail && e.detail.id ? e.detail.id : '';
      const value = e.detail && typeof e.detail.capacity === 'number' ? e.detail.capacity : null;
      if (!id || value == null) return;
      this._persistCapacity(id, value);
      this.applyCapacityUpdate(id, value);
      this.dispatchEvent(new CustomEvent('capacity-updated', {
        detail: { id, capacity: value },
        bubbles: true,
        composed: true
      }));
    });
    container.appendChild(this._capacityCard);

    // Create expandable-row-list for stories
    const stories = Array.isArray(epic.stories) ? epic.stories : [];
    
    const expandableRows = stories.map(story => {
      const backgroundColor = STORY_STATUS_COLORS[story.status] || 'transparent';
      
      // Build data-row for the story
      const storyIdColumn = {
        name: "ID",
        width: "10%",
        contents: story.id || ''
      };
      if (story.link) {
        storyIdColumn.link = story.link;
      }
      
      const storyDataRow = {
        options: {
          "show-column-names": true,
          "border-color": "black",
          "background-color": backgroundColor
        },
        columns: [
          storyIdColumn,
          {
            name: "Name",
            width: "30%",
            contents: story.name || ''
          },
          {
            name: "Description",
            width: "40%",
            contents: story.description || ''
          },
          {
            name: "Status",
            width: "10%",
            contents: story.jira_status || ''
          },
          {
            name: "Points",
            width: "10%",
            contents: String(story.points || story.total_points || 0)
          }
        ]
      };

      // Build expandable-list for tasks
      const tasks = Array.isArray(story.tasks) ? story.tasks : [];
      const taskRowData = tasks.map(task => [
        task.id || '',
        task.name || '',
        task.description || '',
        task.status || '',
        String(task.points || 0)
      ]);
      
      // Build column-links array for tasks (link the ID column if task has a link)
      const taskColumnLinks = tasks.map(task => 
        task.link || null
      );
      
      // Apply same color coding to tasks based on their status
      const taskRowColors = tasks.map(task => 
        STORY_STATUS_COLORS[task.status] || 'transparent'
      );
      
      const columnWidths = ['10%', '30%', '40%', '10%', '10%'];
      const columnNumLines = [1, 3, 3, 1, 1]; // Truncate ID and Status to 1 line, allow more for Name and Description
      const columnVerticalAligns = ['top', 'top', 'top', 'center', 'center']; // First 3 columns top-aligned, final 2 centered

      return {
        "data-row": storyDataRow,
        "expandable-list": {
          "column-widths": columnWidths,
          "column-num-lines": columnNumLines,
          "column-vertical-aligns": columnVerticalAligns,
          "column-links": taskColumnLinks,
          "row-data": taskRowData,
          "row-background-colors": taskRowColors
        },
        "options": {
          "border-color": "black",
          "background-color": "transparent",
          "detail-rows-have-borders": false,
          "show-detail-section-border": true
        }
      };
    });

    const expandableRowList = document.createElement('expandable-row-list');
    expandableRowList.setAttribute('data', JSON.stringify(expandableRows));
    container.appendChild(expandableRowList);

    this.innerHTML = '';
    this.appendChild(container);
  }

  _openCapacityModal(title, id, holidays) {
    if (!this._capacityCard) return;
    this._capacityCard.setAttribute('data', JSON.stringify({ title, id, holidays: holidays || [] }));
    this._capacityCard.setAttribute('open', '');
  }

  _closeCapacityModal() {
    if (!this._capacityCard) return;
    this._capacityCard.removeAttribute('open');
  }

  _loadCapacity(id) {
    try {
      const key = `progress-card-capacity-${id}`;
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load capacity from localStorage:', e);
    }
    return 1.00;
  }

  _persistCapacity(id, capacity) {
    try {
      const key = `progress-card-capacity-${id}`;
      localStorage.setItem(key, String(capacity));
    } catch (e) {
      console.warn('Failed to save capacity to localStorage:', e);
    }
  }

  applyCapacityUpdate(id, capacity) {
    if (!this._progressCard || !id || id !== this._currentEpicId) return;
    let raw = this._progressCard.getAttribute('data') || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { parsed = {}; }
    parsed.capacity = capacity;
    this._progressCard.setAttribute('data', JSON.stringify(parsed));
  }
}

customElements.define('mission-control-epic-detail', MissionControlEpicDetail);

