# Task Manager - Design Specification Document

**Document Version:** 1.0  
**Date:** February 19, 2026  
**Status:** Approved

---

## 1. Introduction

### 1.1 Purpose
This document provides detailed technical design specifications for the Task Manager web application, including architecture, data models, component design, and implementation details.

### 1.2 Scope
Covers the complete design of the client-side task management application including UI components, data structures, and interaction patterns.

### 1.3 References
- Requirements Document v1.0
- WCAG 2.1 Guidelines
- MDN Web Docs

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Task Manager Application                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Presentation │  │   Business   │  │    Data      │      │
│  │    Layer      │  │    Logic     │  │   Layer      │      │
│  │  (HTML/CSS)   │  │    (JS)      │  │ (localStorage)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Structure | HTML5 | Semantic markup, accessibility |
| Styling | CSS3 | Layout, theming, animations |
| Logic | Vanilla JavaScript (ES6+) | Application behavior |
| Storage | localStorage API | Data persistence |
| Hosting | GitHub Pages | Static file serving |

### 2.3 File Structure

```
Task-Manager/
├── index.html              # Main application entry point
├── styles.css              # All application styles
├── script.js               # Application logic
├── README.md               # Project documentation
├── Documentation/
│   ├── Requirements.md     # Requirements specification
│   └── Design-Specification.md  # This document
└── .github/
    ├── workflows/
    │   └── deploy.yml      # CI/CD pipeline
    └── agents/             # AI agent configurations
```

---

## 3. Data Model

### 3.1 Task Entity

```javascript
{
    id: String,           // Unique identifier (timestamp-based)
    text: String,         // Task description (1-500 chars)
    completed: Boolean,   // Completion status
    dueDate: String|null, // ISO date string (YYYY-MM-DD) or null
    dueTime: String|null, // Time string (HH:MM) or null
    effort: Number|null,  // Hours (0.5-100) or null
    createdAt: Number     // Unix timestamp
}
```

### 3.2 ID Generation

```javascript
// Pattern: mlXXXXXXXXXXXXXXXXXX
// Prefix 'ml' + timestamp-based random string
function generateId() {
    return 'ml' + Date.now().toString(36) + 
           Math.random().toString(36).slice(2);
}
```

### 3.3 Storage Schema

**Key:** `tasks`  
**Value:** JSON array of Task objects

```javascript
// localStorage structure
{
    "tasks": [
        { id, text, completed, dueDate, dueTime, effort, createdAt },
        // ... more tasks
    ]
}
```

### 3.4 Additional Storage Keys

| Key | Type | Purpose |
|-----|------|---------|
| `darkMode` | Boolean | Theme preference |
| `currentView` | String | 'list' or 'timeline' |
| `collapsedSections` | Object | Section collapse states |

---

## 4. Component Design

### 4.1 Component Hierarchy

```
App
├── Header
│   ├── Title
│   ├── Subtitle  
│   └── ThemeToggle
├── Main
│   ├── TaskInput
│   │   ├── TextInput
│   │   ├── DateInput
│   │   ├── TimeSelect
│   │   ├── EffortInput
│   │   └── AddButton
│   ├── FilterBar
│   │   ├── FilterButtons
│   │   ├── ViewToggle
│   │   └── TaskCounts
│   ├── ListView
│   │   ├── TaskSection (Past Due)
│   │   ├── TaskSection (Due Today)
│   │   ├── TaskSection (Upcoming)
│   │   └── TaskSection (Completed)
│   └── TimelineView
│       ├── Controls
│       ├── Sidebar
│       ├── ScrollArea
│       │   ├── Header
│       │   ├── Body
│       │   └── NowIndicator
│       └── UnscheduledArea
└── Footer
```

### 4.2 TaskInput Component

#### Structure
```html
<section class="task-input">
    <form id="task-form">
        <div class="input-group">
            <!-- Row 1: Task + Date -->
            <input type="text" id="task-input">
            <div class="due-date-group">
                <input type="date" id="due-date-input">
            </div>
            <!-- Row 2: Time + Effort + Button -->
            <div class="due-time-group">
                <select id="due-time-input">...</select>
            </div>
            <div class="effort-group">
                <input type="number" id="effort-input">
            </div>
            <button type="submit" id="add-btn">Add Task</button>
        </div>
    </form>
</section>
```

#### Grid Layout
```css
.input-group {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 0.75rem;
}

/* Placement */
#task-input      { grid-column: 1/3; grid-row: 1; }
.due-date-group  { grid-column: 3;   grid-row: 1; }
.due-time-group  { grid-column: 1;   grid-row: 2; }
.effort-group    { grid-column: 2;   grid-row: 2; }
#add-btn         { grid-column: 3;   grid-row: 2; }
```

### 4.3 TaskItem Component

#### Structure
```html
<article class="task-item [completed] [overdue|approaching|due-today]">
    <div class="task-checkbox">
        <input type="checkbox" id="task-{id}">
        <label for="task-{id}">
            <span class="checkmark">✓</span>
        </label>
    </div>
    <div class="task-content">
        <p class="task-text">{text}</p>
        <div class="task-meta">
            <span class="due-badge">{due info}</span>
            <span class="effort-badge">{effort}h</span>
        </div>
    </div>
    <div class="task-actions">
        <button class="edit-btn">✏️</button>
        <button class="delete-btn">🗑️</button>
    </div>
</article>
```

#### States
- Default: Standard display
- Completed: Strikethrough text, muted colors
- Overdue: Pink/red border accent
- Approaching: Orange/yellow border accent
- Due Today: Blue border accent

### 4.4 Timeline Component

#### Structure
```html
<section class="timeline-view">
    <div class="timeline-controls">
        <div class="timeline-zoom">
            <button class="zoom-btn" data-zoom="hour">Hour</button>
            <button class="zoom-btn" data-zoom="day">Day</button>
            <button class="zoom-btn" data-zoom="week">Week</button>
        </div>
        <div class="timeline-nav">
            <button class="nav-btn" data-nav="prev">←</button>
            <span id="zoom-level">Day View</span>
            <button class="nav-btn" data-nav="next">→</button>
        </div>
    </div>
    <div class="timeline-container">
        <div class="timeline-sidebar">{task labels}</div>
        <div class="timeline-scroll-area">
            <div class="timeline-header">{time columns}</div>
            <div class="timeline-body">{task bars}</div>
            <div class="timeline-now-indicator"></div>
        </div>
    </div>
    <div class="unscheduled-tasks">{unscheduled task list}</div>
</section>
```

#### Timeline Configuration
```javascript
const TIMELINE_CONFIG = {
    hour: {
        unitWidth: 60,      // pixels per hour
        units: 24,          // hours shown
        headerFormat: 'HH:00'
    },
    day: {
        unitWidth: 100,     // pixels per day
        units: 14,          // days shown (2 weeks)
        headerFormat: 'ddd DD'
    },
    week: {
        unitWidth: 150,     // pixels per week
        units: 8,           // weeks shown
        headerFormat: 'Week WW'
    }
};
```

---

## 5. Styling Architecture

### 5.1 CSS Custom Properties

```css
:root {
    /* Colors */
    --primary-color: #6366f1;
    --primary-hover: #4f46e5;
    --primary-light: #e0e7ff;
    --success-color: #10b981;
    --danger-color: #ef4444;
    --warning-color: #f59e0b;
    --overdue-color: #ec4899;
    --today-color: #3b82f6;
    
    /* Backgrounds */
    --bg-color: #f8fafc;
    --card-bg: #ffffff;
    
    /* Text */
    --text-primary: #1e293b;
    --text-secondary: #64748b;
    --text-muted: #94a3b8;
    
    /* Borders & Shadows */
    --border-color: #e2e8f0;
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    
    /* Spacing */
    --radius-sm: 0.375rem;
    --radius-md: 0.5rem;
    --radius-lg: 0.75rem;
    
    /* Transitions */
    --transition-fast: 150ms ease;
    --transition-normal: 250ms ease;
}
```

### 5.2 Dark Mode Variables

```css
.dark-mode {
    --bg-color: #0f172a;
    --card-bg: #1e293b;
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #64748b;
    --border-color: #334155;
    --primary-light: rgba(99, 102, 241, 0.2);
}
```

### 5.3 Responsive Breakpoints

| Breakpoint | Width | Layout Adjustments |
|------------|-------|-------------------|
| Desktop | > 1024px | Full 3-column input grid |
| Tablet | 768-1024px | 2-column input grid |
| Small Tablet | 640-767px | Adjusted spacing |
| Mobile | < 640px | Single column stack |

---

## 6. Business Logic

### 6.1 Due Date Status Calculation

```javascript
function getDueStatus(task) {
    if (!task.dueDate) return null;
    if (task.completed) return 'completed';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(task.dueDate + 'T00:00:00');
    const diffDays = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'due-today';
    if (diffDays <= 3) return 'approaching';
    return 'upcoming';
}
```

### 6.2 Task Sorting Algorithm

```javascript
function sortTasks(tasks) {
    return tasks.sort((a, b) => {
        // Completed tasks last
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        
        // Tasks with due dates before those without
        if (!!a.dueDate !== !!b.dueDate) {
            return a.dueDate ? -1 : 1;
        }
        
        // Sort by due date (earliest first)
        if (a.dueDate && b.dueDate) {
            const dateCompare = new Date(a.dueDate) - new Date(b.dueDate);
            if (dateCompare !== 0) return dateCompare;
            
            // Same date: sort by time
            if (a.dueTime && b.dueTime) {
                return a.dueTime.localeCompare(b.dueTime);
            }
        }
        
        // Finally by creation time
        return a.createdAt - b.createdAt;
    });
}
```

### 6.3 Timeline Bar Positioning

```javascript
function calculateBarPosition(task, config, startDate) {
    const dueDateTime = new Date(task.dueDate + 'T' + (task.dueTime || '23:59') + ':00');
    const effortMs = (task.effort || 1) * 60 * 60 * 1000;
    const startTime = new Date(dueDateTime.getTime() - effortMs);
    
    const offsetMs = startTime - startDate;
    const leftPx = (offsetMs / config.msPerUnit) * config.unitWidth;
    const widthPx = Math.max(20, (effortMs / config.msPerUnit) * config.unitWidth);
    
    return { left: leftPx, width: widthPx };
}
```

---

## 7. Event Handling

### 7.1 Event Flow

```
User Action → Event Listener → State Update → Re-render → DOM Update
```

### 7.2 Key Event Handlers

| Event | Element | Handler |
|-------|---------|---------|
| submit | #task-form | addTask() |
| click | .task-checkbox | toggleTask(id) |
| click | .delete-btn | deleteTask(id) |
| click | .edit-btn | editTask(id) |
| click | .theme-toggle | toggleDarkMode() |
| click | .view-btn | setView(view) |
| click | .filter-btn | setFilter(filter) |
| dragstart | .timeline-bar | startDrag(e) |
| dragend | .timeline-bar | endDrag(e) |
| mousedown | .timeline-bar-handle | startResize(e) |

### 7.3 Drag and Drop Implementation

```javascript
// Drag to reschedule
function handleDragStart(e) {
    e.dataTransfer.setData('taskId', e.target.dataset.taskId);
    e.target.classList.add('dragging');
}

function handleDrop(e) {
    const taskId = e.dataTransfer.getData('taskId');
    const dropPosition = e.clientX - timelineBody.getBoundingClientRect().left;
    const newDate = positionToDate(dropPosition);
    updateTaskDate(taskId, newDate);
}

// Resize to change effort
function handleResize(e, handle) {
    const bar = handle.parentElement;
    const taskId = bar.dataset.taskId;
    const startX = e.clientX;
    const startWidth = bar.offsetWidth;
    
    const onMouseMove = (moveEvent) => {
        const delta = moveEvent.clientX - startX;
        const newWidth = handle.dataset.handle === 'right' 
            ? startWidth + delta 
            : startWidth - delta;
        bar.style.width = Math.max(20, newWidth) + 'px';
    };
    
    const onMouseUp = () => {
        const newEffort = widthToEffort(bar.offsetWidth);
        updateTaskEffort(taskId, newEffort);
        document.removeEventListener('mousemove', onMouseMove);
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp, { once: true });
}
```

---

## 8. Accessibility Design

### 8.1 ARIA Implementation

```html
<!-- Task checkbox -->
<input type="checkbox" 
       id="task-{id}" 
       aria-label="Mark {taskText} as complete">

<!-- Timeline bar -->
<div class="timeline-bar"
     role="button"
     tabindex="0"
     aria-label="{taskText}, {effort} hours effort">

<!-- Collapsible section -->
<button class="section-toggle"
        aria-expanded="true"
        aria-controls="section-{name}">
```

### 8.2 Keyboard Navigation

| Key | Context | Action |
|-----|---------|--------|
| Tab | Global | Move focus to next element |
| Enter | Task input | Submit new task |
| Space | Checkbox | Toggle completion |
| Enter | Timeline bar | Open edit dialog |
| Delete | Timeline bar | Delete task |
| Escape | Edit mode | Cancel editing |

### 8.3 Focus Management

```javascript
// Trap focus in modals
function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    
    element.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
}
```

---

## 9. Security Considerations

### 9.1 XSS Prevention

```javascript
// Sanitize user input before rendering
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Use textContent instead of innerHTML where possible
element.textContent = userInput;  // Safe
element.innerHTML = userInput;     // Dangerous
```

### 9.2 Input Validation

```javascript
function validateTask(text, dueDate, effort) {
    const errors = [];
    
    if (!text || text.trim().length === 0) {
        errors.push('Task description is required');
    }
    if (text && text.length > 500) {
        errors.push('Task description too long');
    }
    if (effort && (effort < 0.5 || effort > 100)) {
        errors.push('Effort must be between 0.5 and 100 hours');
    }
    if (dueDate && isNaN(Date.parse(dueDate))) {
        errors.push('Invalid date format');
    }
    
    return errors;
}
```

---

## 10. Performance Optimization

### 10.1 Rendering Strategy

- **Virtual DOM-like approach:** Only re-render changed sections
- **Debounced updates:** Batch rapid changes (e.g., resize operations)
- **RAF scheduling:** Use requestAnimationFrame for visual updates

### 10.2 Memory Management

```javascript
// Clean up event listeners on element removal
function removeTask(taskId) {
    const element = document.querySelector(`[data-task-id="${taskId}"]`);
    // Clone to remove all listeners
    const clone = element.cloneNode(true);
    element.replaceWith(clone);
    // Then remove
    clone.remove();
}
```

### 10.3 Storage Optimization

- Store only essential data (no computed values)
- Use compression for large datasets (future consideration)
- Implement data migration for schema changes

---

## 11. Testing Strategy

### 11.1 Unit Tests (Planned)

| Function | Test Cases |
|----------|------------|
| generateId() | Uniqueness, format validation |
| getDueStatus() | All status variations |
| sortTasks() | Ordering combinations |
| escapeHtml() | XSS payload handling |

### 11.2 Integration Tests (Planned)

| Scenario | Verification |
|----------|--------------|
| Add task | Task appears in correct section |
| Complete task | Moves to completed section |
| Toggle theme | All elements update colors |
| Switch views | Correct view displays |

### 11.3 Accessibility Tests

- Automated: axe-core, WAVE
- Manual: Screen reader testing (NVDA, VoiceOver)
- Keyboard-only navigation verification

---

## 12. Future Enhancements

### 12.1 Planned Features

| Feature | Priority | Complexity |
|---------|----------|------------|
| Task categories/tags | Medium | Medium |
| Recurring tasks | Low | High |
| Export/Import data | Medium | Low |
| Subtasks | Low | High |
| Notifications API | Medium | Medium |

### 12.2 Technical Debt

- Add comprehensive test suite
- Implement proper state management
- Add service worker for offline support
- Optimize for >1000 tasks

---

## 13. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-19 | Development Team | Initial release |
