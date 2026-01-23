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
 *   - stories: array of story objects
 *     - id: string - story identifier (e.g., "STORY-456")
 *     - tasks: array of task objects
 *       - id: string - task identifier (e.g., "TASK-789")
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
import '../../presentational/progress-card/ProgressCard.js';
import '../../presentational/expandable-row-list/ExpandableRowList.js';

// Status color constants for easier maintenance
const STORY_STATUS_COLORS = {
  IN_PROGRESS: 'darkgreen',
  COMPLETE: 'darkblue',
  BLOCKED: 'darkred'
};

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

    const { epic } = parsedData;
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

    const progressCardData = {
      title: epic.name,
      progress: progress,
      blocked: blocked,
      projected_completion: epic.projected_completion,
      "data-row": {
        options: {
          show_column_names: true,
          "border-color": "transparent",
          "background-color": "transparent"
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
            contents: epic.jira_status || epic.status
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
    container.appendChild(progressCard);

    // Create expandable-row-list for stories
    const stories = Array.isArray(epic.stories) ? epic.stories : [];
    
    const expandableRows = stories.map(story => {
      const backgroundColor = STORY_STATUS_COLORS[story.status] || 'transparent';
      
      // Build data-row for the story
      const storyDataRow = {
        options: {
          show_column_names: true,
          "border-color": "black",
          "background-color": backgroundColor
        },
        columns: [
          {
            name: "ID",
            width: "10%",
            contents: story.id || ''
          },
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
            contents: story.status || ''
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
      
      // Apply same color coding to tasks based on their status
      const taskRowColors = tasks.map(task => 
        STORY_STATUS_COLORS[task.status] || 'transparent'
      );
      
      const columnWidths = ['10%', '30%', '40%', '10%', '10%'];

      return {
        "data-row": storyDataRow,
        "expandable-list": {
          "column-widths": columnWidths,
          "row-data": taskRowData,
          "row-background-colors": taskRowColors
        },
        "options": {
          "border-color": "black",
          "background-color": "transparent"
        }
      };
    });

    const expandableRowList = document.createElement('expandable-row-list');
    expandableRowList.setAttribute('data', JSON.stringify(expandableRows));
    container.appendChild(expandableRowList);

    this.innerHTML = '';
    this.appendChild(container);
  }
}

customElements.define('mission-control-epic-detail', MissionControlEpicDetail);

