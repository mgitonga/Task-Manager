/**
 * Task Manager Application
 * A simple, accessible task management app with local storage persistence
 */

// ===== DOM Elements =====
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const dueDateInput = document.getElementById('due-date-input');
const dueTimeInput = document.getElementById('due-time-input');
const effortInput = document.getElementById('effort-input');
const taskList = document.getElementById('task-list');
const dueTodayList = document.getElementById('due-today-list');
const dueTodaySection = document.getElementById('due-today-section');
const pastDueList = document.getElementById('past-due-list');
const pastDueSection = document.getElementById('past-due-section');
const upcomingList = document.getElementById('upcoming-list');
const upcomingSection = document.getElementById('upcoming-section');
const completedList = document.getElementById('completed-list');
const completedSection = document.getElementById('completed-section');
const emptyState = document.getElementById('empty-state');
const filterButtons = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('theme-toggle');

// View toggle elements
const viewToggleButtons = document.querySelectorAll('.view-toggle-btn');
const listView = document.getElementById('list-view');
const timelineView = document.getElementById('timeline-view');

// Timeline elements
const timelineContainer = document.getElementById('timeline-container');
const timelineSidebar = document.getElementById('timeline-sidebar');
const timelineScrollArea = document.getElementById('timeline-scroll-area');
const timelineHeader = document.getElementById('timeline-header');
const timelineBody = document.getElementById('timeline-body');
const timelineNow = document.getElementById('timeline-now');
const zoomLevelDisplay = document.getElementById('zoom-level');
const zoomButtons = document.querySelectorAll('.zoom-btn');
const navButtons = document.querySelectorAll('.nav-btn');
const unscheduledList = document.getElementById('unscheduled-list');

// Count elements
const countAll = document.getElementById('count-all');
const countActive = document.getElementById('count-active');
const countCompleted = document.getElementById('count-completed');
const countDueToday = document.getElementById('count-due-today');
const countPastDue = document.getElementById('count-past-due');
const countUpcoming = document.getElementById('count-upcoming');
const countCompletedSection = document.getElementById('count-completed-section');

// ===== State =====
let tasks = [];
let currentFilter = 'all';
let currentView = 'list'; // 'list' or 'timeline'

// Timeline state
const ZOOM_LEVELS = ['hour', 'day', 'week'];
let currentZoomLevel = 1; // Index into ZOOM_LEVELS (default: 'day')
let timelineStartDate = new Date();
let isDragging = false;
let isResizing = false;
let dragTask = null;
let dragStartX = 0;
let dragStartLeft = 0;
let dragStartWidth = 0;
let resizeHandle = null;
let dropZonesInitialized = false;

// ===== Local Storage =====
const STORAGE_KEY = 'taskManager_tasks';
const THEME_KEY = 'taskManager_theme';
const COLLAPSED_KEY = 'taskManager_collapsed';
const VIEW_KEY = 'taskManager_view';

/**
 * Load tasks from local storage
 */
function loadTasks() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            tasks = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading tasks from storage:', error);
        tasks = [];
    }
}

/**
 * Save tasks to local storage
 */
function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        console.error('Error saving tasks to storage:', error);
    }
}

// ===== Task Operations =====
/**
 * Generate a unique ID for new tasks
 * @returns {string} Unique identifier
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Add a new task
 * @param {string} text - Task description
 * @param {string|null} dueDate - Optional due date (YYYY-MM-DD format)
 * @param {string|null} dueTime - Optional due time (HH:MM format)
 * @param {number|null} effort - Optional level of effort in hours
 */
function addTask(text, dueDate = null, dueTime = null, effort = null) {
    const task = {
        id: generateId(),
        text: text.trim(),
        completed: false,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        effort: effort || null,
        createdAt: new Date().toISOString()
    };
    
    tasks.unshift(task); // Add to beginning of array
    saveTasks();
    renderTasks();
    if (currentView === 'timeline') {
        renderTimeline();
    }
    const dueDateTimeStr = formatDateTimeForDisplay(dueDate, dueTime);
    const effortStr = effort ? ` (${effort}h effort)` : '';
    announceToScreenReader(`Task "${text}" added${dueDateTimeStr ? ` due ${dueDateTimeStr}` : ''}${effortStr}`);
}

/**
 * Delete a task by ID
 * @param {string} id - Task ID to delete
 */
function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
        if (currentView === 'timeline') {
            renderTimeline();
        }
        announceToScreenReader(`Task "${task.text}" deleted`);
    }
}

/**
 * Toggle task completion status
 * @param {string} id - Task ID to toggle
 */
function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        if (currentView === 'timeline') {
            renderTimeline();
        }
        announceToScreenReader(`Task "${task.text}" marked as ${task.completed ? 'completed' : 'active'}`);
    }
}

/**
 * Update a task's properties
 * @param {string} id - Task ID to update
 * @param {Object} updates - Object with properties to update
 */
function updateTask(id, updates) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        Object.assign(task, updates);
        saveTasks();
        renderTasks();
        if (currentView === 'timeline') {
            renderTimeline();
        }
        announceToScreenReader(`Task updated`);
    }
}

/**
 * Enter edit mode for a task
 * @param {string} id - Task ID to edit
 */
function enterEditMode(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const taskItem = document.querySelector(`.task-item[data-id="${id}"]`);
    if (!taskItem) return;
    
    taskItem.classList.add('editing');
    
    const taskContent = taskItem.querySelector('.task-content');
    const originalText = task.text;
    const originalDueDate = task.dueDate || '';
    const originalDueTime = task.dueTime || '';
    const originalEffort = task.effort || '';
    
    // Build time options for select
    const timeOptions = ['<option value="">Time</option>'];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            const selected = time === originalDueTime ? ' selected' : '';
            timeOptions.push(`<option value="${time}"${selected}>${time}</option>`);
        }
    }
    
    taskContent.innerHTML = `
        <div class="edit-form">
            <input 
                type="text" 
                class="edit-input" 
                value="${escapeHtml(originalText)}"
                aria-label="Edit task text"
            >
            <div class="edit-datetime">
                <input 
                    type="date" 
                    class="edit-date" 
                    value="${originalDueDate}"
                    aria-label="Edit due date"
                >
                <select class="edit-time" aria-label="Edit due time">
                    ${timeOptions.join('')}
                </select>
                <input 
                    type="number" 
                    class="edit-effort" 
                    value="${originalEffort}"
                    placeholder="Hrs"
                    min="0.5"
                    max="100"
                    step="0.5"
                    aria-label="Edit effort in hours"
                >
            </div>
            <div class="edit-actions">
                <button type="button" class="save-edit-btn" aria-label="Save changes">Save</button>
                <button type="button" class="cancel-edit-btn" aria-label="Cancel editing">Cancel</button>
            </div>
        </div>
    `;
    
    const editInput = taskContent.querySelector('.edit-input');
    const editDate = taskContent.querySelector('.edit-date');
    const editTime = taskContent.querySelector('.edit-time');
    const editEffort = taskContent.querySelector('.edit-effort');
    const saveBtn = taskContent.querySelector('.save-edit-btn');
    const cancelBtn = taskContent.querySelector('.cancel-edit-btn');
    
    editInput.focus();
    editInput.select();
    
    const saveChanges = () => {
        const newText = editInput.value.trim();
        if (newText) {
            updateTask(id, {
                text: newText,
                dueDate: editDate.value || null,
                dueTime: editTime.value || null,
                effort: editEffort.value ? parseFloat(editEffort.value) : null
            });
        } else {
            renderTasks(); // Revert if empty
        }
    };
    
    const cancelEdit = () => {
        renderTasks();
    };
    
    saveBtn.addEventListener('click', saveChanges);
    cancelBtn.addEventListener('click', cancelEdit);
    
    editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveChanges();
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    });
}

// ===== Due Date Helpers =====
/**
 * Get today's date as YYYY-MM-DD string
 * @returns {string} Today's date
 */
function getTodayString() {
    const today = new Date();
    // Use local date components to match HTML date input format
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get the due date status of a task
 * @param {Object} task - Task object
 * @returns {string|null} 'overdue', 'approaching', 'due-today', or null
 */
function getDueDateStatus(task) {
    if (!task.dueDate || task.completed) return null;

    // Use local dates to match HTML date input format
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [yearStr, monthStr, dayStr] = task.dueDate.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1; // Month is zero-based
    const day = Number(dayStr);

    // Guard against invalid date components
    if (Number.isNaN(year) || Number.isNaN(monthIndex) || Number.isNaN(day)) {
        return null;
    }

    const dueDate = new Date(year, monthIndex, day);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'due-today';
    if (diffDays <= 3) return 'approaching';
    return null;
}

/**
 * Check if a task is due today
 * @param {Object} task - Task object
 * @returns {boolean} True if task is due today
 */
function isDueToday(task) {
    if (!task.dueDate || task.completed) return false;
    return task.dueDate === getTodayString();
}

/**
 * Format date for display
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
}

/**
 * Format time for display (24-hour format)
 * @param {string} timeString - Time in HH:MM format
 * @returns {string} Formatted time string
 */
function formatTimeForDisplay(timeString) {
    if (!timeString) return '';
    return timeString; // Already in 24-hour HH:MM format
}

/**
 * Format date and time together for display
 * @param {string|null} dateString - Date in YYYY-MM-DD format
 * @param {string|null} timeString - Time in HH:MM format
 * @returns {string} Formatted date/time string
 */
function formatDateTimeForDisplay(dateString, timeString) {
    const datePart = formatDateForDisplay(dateString);
    const timePart = formatTimeForDisplay(timeString);
    
    if (datePart && timePart) return `${datePart} at ${timePart}`;
    if (datePart) return datePart;
    if (timePart) return `at ${timePart}`;
    return '';
}

/**
 * Get the time-based urgency status of a task
 * @param {Object} task - Task object
 * @returns {string|null} 'time-imminent' (< 30 min), 'time-approaching' (< 1 hour), or null
 */
function getTimeStatus(task) {
    if (!task.dueDate || !task.dueTime || task.completed) return null;
    
    const now = new Date();
    const [hours, minutes] = task.dueTime.split(':').map(Number);
    const dueDateTime = new Date(task.dueDate + 'T00:00:00');
    dueDateTime.setHours(hours, minutes, 0, 0);
    
    const diffMs = dueDateTime.getTime() - now.getTime();
    const diffMinutes = diffMs / (1000 * 60);
    
    // Only show alert for tasks due within the next hour and not overdue
    if (diffMinutes < 0) return null; // Already passed
    if (diffMinutes <= 30) return 'time-imminent';
    if (diffMinutes <= 60) return 'time-approaching';
    return null;
}

// ===== Filtering =====
/**
 * Get filtered tasks based on current filter
 * @returns {Array} Filtered tasks
 */
function getFilteredTasks() {
    switch (currentFilter) {
        case 'active':
            return tasks.filter(t => !t.completed);
        case 'completed':
            return tasks.filter(t => t.completed);
        default:
            return tasks;
    }
}

/**
 * Set the current filter
 * @param {string} filter - Filter type ('all', 'active', 'completed')
 */
function setFilter(filter) {
    currentFilter = filter;
    
    // Update button states
    filterButtons.forEach(btn => {
        const isActive = btn.dataset.filter === filter;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive);
    });
    
    renderTasks();
    if (currentView === 'timeline') {
        renderTimeline();
    }
}

// ===== Rendering =====
/**
 * Render the task list
 */
function renderTasks() {
    const filteredTasks = getFilteredTasks();
    
    // Clear existing tasks
    taskList.innerHTML = '';
    dueTodayList.innerHTML = '';
    pastDueList.innerHTML = '';
    upcomingList.innerHTML = '';
    completedList.innerHTML = '';
    
    // Update counts
    updateCounts();
    
    // Separate completed and active tasks
    const completedTasks = filteredTasks.filter(t => t.completed);
    const activeTasks = filteredTasks.filter(t => !t.completed);
    
    // Categorize active tasks by due date status
    const tasksDueToday = activeTasks.filter(t => isDueToday(t));
    const tasksPastDue = activeTasks.filter(t => getDueDateStatus(t) === 'overdue');
    const tasksUpcoming = activeTasks.filter(t => {
        const status = getDueDateStatus(t);
        return t.dueDate && !isDueToday(t) && status !== 'overdue';
    });
    // Tasks with no due date
    const tasksOther = activeTasks.filter(t => {
        return !isDueToday(t) && getDueDateStatus(t) !== 'overdue' && !t.dueDate;
    });
    
    // Show/hide Past Due section
    if (tasksPastDue.length > 0) {
        pastDueSection.classList.remove('hidden');
        tasksPastDue.forEach(task => {
            pastDueList.appendChild(createTaskElement(task));
        });
    } else {
        pastDueSection.classList.add('hidden');
    }
    
    // Show/hide Due Today section
    if (tasksDueToday.length > 0) {
        dueTodaySection.classList.remove('hidden');
        tasksDueToday.forEach(task => {
            dueTodayList.appendChild(createTaskElement(task));
        });
    } else {
        dueTodaySection.classList.add('hidden');
    }
    
    // Show/hide Upcoming section
    if (tasksUpcoming.length > 0) {
        upcomingSection.classList.remove('hidden');
        tasksUpcoming.forEach(task => {
            upcomingList.appendChild(createTaskElement(task));
        });
    } else {
        upcomingSection.classList.add('hidden');
    }
    
    // Show/hide Completed section
    if (completedTasks.length > 0) {
        completedSection.classList.remove('hidden');
        completedTasks.forEach(task => {
            completedList.appendChild(createTaskElement(task));
        });
    } else {
        completedSection.classList.add('hidden');
    }
    
    // Show tasks with no due date in main list
    const hasAnyTasks = tasksDueToday.length > 0 || tasksPastDue.length > 0 || tasksUpcoming.length > 0 || tasksOther.length > 0 || completedTasks.length > 0;
    
    // Show/hide empty state
    if (!hasAnyTasks) {
        emptyState.classList.remove('hidden');
        taskList.setAttribute('aria-hidden', 'true');
    } else {
        emptyState.classList.add('hidden');
        taskList.removeAttribute('aria-hidden');
        
        // Render tasks with no due date in main list
        tasksOther.forEach(task => {
            taskList.appendChild(createTaskElement(task));
        });
    }
}

/**
 * Create a task list item element
 * @param {Object} task - Task object
 * @returns {HTMLElement} Task list item
 */
function createTaskElement(task) {
    const li = document.createElement('li');
    const dueDateStatus = getDueDateStatus(task);
    const timeStatus = getTimeStatus(task);
    let className = 'task-item';
    if (task.completed) className += ' completed';
    if (dueDateStatus) className += ` ${dueDateStatus}`;
    if (timeStatus) className += ` ${timeStatus}`;
    li.className = className;
    li.dataset.id = task.id;
    
    // Build due date/time badge HTML
    let dueDateHtml = '';
    if (task.dueDate || task.dueTime) {
        const statusClass = dueDateStatus ? ` ${dueDateStatus}` : '';
        const formattedDateTime = formatDateTimeForDisplay(task.dueDate, task.dueTime);
        
        // Build bell notification if time is approaching
        let bellHtml = '';
        if (timeStatus) {
            const urgentClass = timeStatus === 'time-imminent' ? ' urgent' : '';
            bellHtml = `
                <span class="reminder-alert${urgentClass}" aria-label="Reminder: task due soon">
                    <span class="bell-icon" aria-hidden="true">🔔</span>
                </span>
            `;
        }
        
        dueDateHtml = `
            <span class="due-date-badge${statusClass}" aria-label="Due ${formattedDateTime}">
                <span class="due-icon" aria-hidden="true">📅</span>
                ${formattedDateTime}
                ${bellHtml}
            </span>
        `;
    }
    
    // Build effort badge HTML
    let effortHtml = '';
    if (task.effort) {
        effortHtml = `
            <span class="effort-badge" aria-label="${task.effort} hours effort">
                <span class="effort-icon" aria-hidden="true">⏱️</span>
                ${task.effort}h
            </span>
        `;
    }
    
    li.innerHTML = `
        <label class="task-checkbox">
            <input 
                type="checkbox" 
                ${task.completed ? 'checked' : ''} 
                aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}: ${escapeHtml(task.text)}"
            >
            <span class="checkmark" aria-hidden="true"></span>
        </label>
        <div class="task-content">
            <span class="task-text">${escapeHtml(task.text)}</span>
            <div class="task-meta">
                ${dueDateHtml}
                ${effortHtml}
            </div>
        </div>
        <div class="task-actions-btns">
            <button 
                class="edit-btn" 
                aria-label="Edit task: ${escapeHtml(task.text)}"
                title="Edit task"
            >
                ✏️
            </button>
            <button 
                class="delete-btn" 
                aria-label="Delete task: ${escapeHtml(task.text)}"
                title="Delete task"
            >
                ×
            </button>
        </div>
    `;
    
    // Add event listeners
    const checkbox = li.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => toggleTask(task.id));
    
    const editBtn = li.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => enterEditMode(task.id));
    
    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteTask(task.id));
    
    return li;
}

/**
 * Update task counts in filter buttons
 */
function updateCounts() {
    const all = tasks.length;
    const active = tasks.filter(t => !t.completed).length;
    const completed = tasks.filter(t => t.completed).length;
    const dueToday = tasks.filter(t => isDueToday(t)).length;
    const pastDue = tasks.filter(t => getDueDateStatus(t) === 'overdue').length;
    const upcoming = tasks.filter(t => {
        const status = getDueDateStatus(t);
        return t.dueDate && !isDueToday(t) && status !== 'overdue' && !t.completed;
    }).length;
    
    countAll.textContent = all;
    countActive.textContent = active;
    countCompleted.textContent = completed;
    countDueToday.textContent = dueToday;
    countPastDue.textContent = pastDue;
    countUpcoming.textContent = upcoming;
    countCompletedSection.textContent = completed;
}

// ===== Utility Functions =====
/**
 * Escape HTML to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Announce message to screen readers
 * @param {string} message - Message to announce
 */
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'visually-hidden';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// ===== Event Listeners =====
// Form submission
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const text = taskInput.value.trim();
    if (!text) {
        taskInput.value = '';
        taskInput.focus();
        taskInput.setAttribute('aria-invalid', 'true');
        announceToScreenReader('Please enter a task description');
        return;
    }
    
    taskInput.removeAttribute('aria-invalid');
    const dueDate = dueDateInput.value || null;
    const dueTime = dueTimeInput.value || null;
    const effort = effortInput.value ? parseFloat(effortInput.value) : null;
    addTask(text, dueDate, dueTime, effort);
    taskInput.value = '';
    dueDateInput.value = '';
    dueTimeInput.value = '';
    effortInput.value = '';
    taskInput.focus();
});

// Filter buttons
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// Theme toggle
themeToggle.addEventListener('click', toggleTheme);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to add task from anywhere
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        taskInput.focus();
    }
});

// ===== Theme Management =====
/**
 * Load saved theme preference
 */
function loadTheme() {
    try {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme) {
            document.body.classList.remove('light-mode', 'dark-mode');
            document.body.classList.add(savedTheme);
        }
    } catch (error) {
        console.error('Error loading theme:', error);
    }
}

/**
 * Toggle between light and dark mode
 */
function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode') ||
        (!document.body.classList.contains('light-mode') && 
         window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    document.body.classList.remove('light-mode', 'dark-mode');
    
    if (isDark) {
        document.body.classList.add('light-mode');
        localStorage.setItem(THEME_KEY, 'light-mode');
        announceToScreenReader('Light mode enabled');
    } else {
        document.body.classList.add('dark-mode');
        localStorage.setItem(THEME_KEY, 'dark-mode');
        announceToScreenReader('Dark mode enabled');
    }
}

// ===== Collapsible Sections =====
/**
 * Load collapsed sections state from localStorage
 */
function loadCollapsedSections() {
    try {
        const stored = localStorage.getItem(COLLAPSED_KEY);
        if (stored) {
            const collapsedIds = JSON.parse(stored);
            collapsedIds.forEach(id => {
                const section = document.getElementById(id);
                if (section) {
                    section.classList.add('collapsed');
                    const button = section.querySelector('.section-title');
                    if (button) {
                        button.setAttribute('aria-expanded', 'false');
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading collapsed sections:', error);
    }
}

/**
 * Save collapsed sections state to localStorage
 */
function saveCollapsedSections() {
    try {
        const collapsedSections = document.querySelectorAll('.collapsible-section.collapsed');
        const collapsedIds = Array.from(collapsedSections).map(s => s.id);
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsedIds));
    } catch (error) {
        console.error('Error saving collapsed sections:', error);
    }
}

/**
 * Setup collapsible section toggle handlers
 */
function setupCollapsibleSections() {
    const sections = document.querySelectorAll('.collapsible-section');
    
    sections.forEach(section => {
        const button = section.querySelector('.section-title');
        if (button) {
            button.addEventListener('click', () => {
                const isCollapsed = section.classList.toggle('collapsed');
                button.setAttribute('aria-expanded', !isCollapsed);
                saveCollapsedSections();
                
                const sectionName = section.querySelector('.section-label')?.textContent || 'Section';
                announceToScreenReader(`${sectionName} ${isCollapsed ? 'collapsed' : 'expanded'}`);
            });
        }
    });
}

// ===== View Toggle =====
/**
 * Load saved view preference
 */
function loadView() {
    try {
        const savedView = localStorage.getItem(VIEW_KEY);
        if (savedView && (savedView === 'list' || savedView === 'timeline')) {
            currentView = savedView;
        }
    } catch (error) {
        console.error('Error loading view preference:', error);
    }
}

/**
 * Switch between list and timeline views
 * @param {string} view - 'list' or 'timeline'
 */
function setView(view) {
    currentView = view;
    
    // Update button states
    viewToggleButtons.forEach(btn => {
        const isActive = btn.dataset.view === view;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive);
    });
    
    // Toggle view visibility
    if (view === 'timeline') {
        listView.classList.add('hidden');
        timelineView.classList.remove('hidden');
        renderTimeline();
    } else {
        timelineView.classList.add('hidden');
        listView.classList.remove('hidden');
    }
    
    // Save preference
    try {
        localStorage.setItem(VIEW_KEY, view);
    } catch (error) {
        console.error('Error saving view preference:', error);
    }
    
    announceToScreenReader(`${view === 'timeline' ? 'Timeline' : 'List'} view activated`);
}

/**
 * Setup view toggle event listeners
 */
function setupViewToggle() {
    viewToggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setView(btn.dataset.view);
        });
    });
}

// ===== Timeline View =====
/**
 * Get timeline configuration based on zoom level
 */
function getTimelineConfig() {
    const zoom = ZOOM_LEVELS[currentZoomLevel];
    const config = {
        zoom,
        cellWidth: 0,
        cellCount: 0,
        format: '',
        msPerCell: 0
    };
    
    switch (zoom) {
        case 'hour':
            config.cellWidth = 60;
            config.cellCount = 24;
            config.format = 'hour';
            config.msPerCell = 60 * 60 * 1000; // 1 hour
            break;
        case 'day':
            config.cellWidth = 100;
            config.cellCount = 14; // 2 weeks
            config.format = 'day';
            config.msPerCell = 24 * 60 * 60 * 1000; // 1 day
            break;
        case 'week':
            config.cellWidth = 120;
            config.cellCount = 8; // 2 months
            config.format = 'week';
            config.msPerCell = 7 * 24 * 60 * 60 * 1000; // 1 week
            break;
    }
    
    return config;
}

/**
 * Get the start of the timeline based on zoom level
 */
function getTimelineStart() {
    const now = new Date();
    const zoom = ZOOM_LEVELS[currentZoomLevel];
    
    switch (zoom) {
        case 'hour':
            // Start at beginning of current day
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        case 'day':
            // Start 3 days ago
            const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            dayStart.setDate(dayStart.getDate() - 3);
            return dayStart;
        case 'week':
            // Start at beginning of current week (Sunday)
            const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() - 7);
            return weekStart;
    }
    
    return now;
}

/**
 * Format header cell based on zoom level
 */
function formatHeaderCell(date, zoom) {
    switch (zoom) {
        case 'hour':
            return date.getHours().toString().padStart(2, '0') + ':00';
        case 'day':
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            return `${days[date.getDay()]} ${date.getDate()}`;
        case 'week':
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[date.getMonth()]} ${date.getDate()}`;
    }
    return '';
}

/**
 * Check if a date is today
 */
function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

/**
 * Check if a date is a weekend
 */
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
}

/**
 * Calculate task bar position and width
 */
function calculateTaskBarPosition(task, config, startTime) {
    const effort = task.effort || 1; // Default 1 hour
    const endTime = startTime.getTime() + (config.cellCount * config.msPerCell);
    
    // Calculate due date/time
    let dueDateTime;
    if (task.dueDate) {
        const timeStr = task.dueTime || '23:59';
        dueDateTime = new Date(task.dueDate + 'T' + timeStr + ':00');
    } else {
        return null; // No due date
    }
    
    // Calculate start time (due time - effort)
    const taskStartTime = new Date(dueDateTime.getTime() - (effort * 60 * 60 * 1000));
    
    // Check if task is visible in current view
    if (taskStartTime.getTime() > endTime || dueDateTime.getTime() < startTime.getTime()) {
        return null; // Task is outside visible range
    }
    
    // Calculate left position (pixels from start)
    const leftMs = Math.max(0, taskStartTime.getTime() - startTime.getTime());
    const leftPx = (leftMs / config.msPerCell) * config.cellWidth;
    
    // Calculate width (effort in hours to pixels)
    const widthMs = effort * 60 * 60 * 1000;
    const widthPx = Math.max(20, (widthMs / config.msPerCell) * config.cellWidth);
    
    return { left: leftPx, width: widthPx, startTime: taskStartTime, endTime: dueDateTime };
}

/**
 * Get task status class for timeline bar
 */
function getTaskStatusClass(task) {
    if (task.completed) return 'completed';
    if (!task.dueDate) return 'no-date';
    
    const status = getDueDateStatus(task);
    if (status === 'overdue') return 'overdue';
    if (status === 'due-today') return 'due-today';
    if (status === 'approaching') return 'approaching';
    return 'upcoming';
}

/**
 * Render the timeline header
 */
function renderTimelineHeader(config, startTime) {
    timelineHeader.innerHTML = '';
    timelineHeader.style.width = `${config.cellWidth * config.cellCount}px`;
    
    for (let i = 0; i < config.cellCount; i++) {
        const cellDate = new Date(startTime.getTime() + (i * config.msPerCell));
        const cell = document.createElement('div');
        cell.className = 'timeline-header-cell';
        cell.style.width = `${config.cellWidth}px`;
        cell.textContent = formatHeaderCell(cellDate, config.zoom);
        
        if (isToday(cellDate)) {
            cell.classList.add('today');
        }
        if (isWeekend(cellDate) && config.zoom !== 'hour') {
            cell.classList.add('weekend');
        }
        
        timelineHeader.appendChild(cell);
    }
}

/**
 * Render the timeline sidebar (task names)
 */
function renderTimelineSidebar(scheduledTasks) {
    timelineSidebar.innerHTML = '';
    
    // Add header spacer to align with timeline header
    const spacer = document.createElement('div');
    spacer.className = 'timeline-sidebar-header';
    timelineSidebar.appendChild(spacer);
    
    scheduledTasks.forEach(task => {
        const label = document.createElement('div');
        label.className = 'timeline-task-label';
        if (task.completed) label.classList.add('completed');
        label.textContent = task.text;
        label.title = task.text;
        timelineSidebar.appendChild(label);
    });
}

/**
 * Render the timeline body (task bars)
 */
function renderTimelineBody(scheduledTasks, config, startTime) {
    timelineBody.innerHTML = '';
    timelineBody.style.width = `${config.cellWidth * config.cellCount}px`;
    
    // Add grid lines
    for (let i = 0; i <= config.cellCount; i++) {
        const gridLine = document.createElement('div');
        gridLine.className = 'timeline-grid-line';
        gridLine.style.left = `${i * config.cellWidth}px`;
        
        const cellDate = new Date(startTime.getTime() + (i * config.msPerCell));
        if (isToday(cellDate)) {
            gridLine.classList.add('today');
        }
        
        timelineBody.appendChild(gridLine);
    }
    
    // Render task rows and bars
    scheduledTasks.forEach((task, index) => {
        const row = document.createElement('div');
        row.className = 'timeline-row';
        row.dataset.taskId = task.id;
        
        const position = calculateTaskBarPosition(task, config, startTime);
        if (position) {
            const bar = document.createElement('div');
            bar.className = `timeline-bar ${getTaskStatusClass(task)}`;
            bar.style.left = `${position.left}px`;
            bar.style.width = `${position.width}px`;
            bar.dataset.taskId = task.id;
            bar.setAttribute('tabindex', '0');
            bar.setAttribute('role', 'button');
            bar.setAttribute('aria-label', `${task.text}, ${task.effort || 1} hours effort`);
            
            // Add resize handles
            const leftHandle = document.createElement('div');
            leftHandle.className = 'timeline-bar-handle left';
            leftHandle.dataset.handle = 'left';
            
            const rightHandle = document.createElement('div');
            rightHandle.className = 'timeline-bar-handle right';
            rightHandle.dataset.handle = 'right';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'timeline-bar-text';
            textSpan.textContent = task.text;
            
            bar.appendChild(leftHandle);
            bar.appendChild(textSpan);
            bar.appendChild(rightHandle);
            
            // Add event listeners for drag and resize
            bar.addEventListener('mousedown', (e) => handleBarMouseDown(e, task, config, startTime));
            bar.addEventListener('touchstart', (e) => handleBarTouchStart(e, task, config, startTime), { passive: false });
            
            // Keyboard navigation
            bar.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    enterEditMode(task.id);
                } else if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    deleteTask(task.id);
                }
            });
            
            // Tooltip on hover
            bar.addEventListener('mouseenter', (e) => showTooltip(e, task));
            bar.addEventListener('mouseleave', hideTooltip);
            
            row.appendChild(bar);
        }
        
        timelineBody.appendChild(row);
    });
}

/**
 * Render the now indicator
 */
function renderNowIndicator(config, startTime) {
    const now = new Date();
    const endTime = startTime.getTime() + (config.cellCount * config.msPerCell);
    
    if (now.getTime() >= startTime.getTime() && now.getTime() <= endTime) {
        const leftMs = now.getTime() - startTime.getTime();
        const leftPx = (leftMs / config.msPerCell) * config.cellWidth;
        timelineNow.style.left = `${leftPx + 150}px`; // +150 for sidebar width
        timelineNow.style.display = 'block';
    } else {
        timelineNow.style.display = 'none';
    }
}

/**
 * Render unscheduled tasks
 */
function renderUnscheduledTasks() {
    const filteredTasks = getFilteredTasks();
    const unscheduledTasks = filteredTasks.filter(t => !t.dueDate);
    
    unscheduledList.innerHTML = '';
    
    if (unscheduledTasks.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'unscheduled-empty';
        empty.textContent = 'No unscheduled tasks';
        unscheduledList.appendChild(empty);
        return;
    }
    
    unscheduledTasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'unscheduled-item';
        if (task.completed) item.classList.add('completed');
        item.dataset.taskId = task.id;
        item.draggable = true;
        item.textContent = task.text;
        item.title = `${task.text}${task.effort ? ` (${task.effort}h)` : ''}`;
        
        // Drag events
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', task.id);
            item.classList.add('dragging');
        });
        
        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
        });
        
        unscheduledList.appendChild(item);
    });
}

/**
 * Main timeline render function
 */
function renderTimeline() {
    if (currentView !== 'timeline') return;
    
    const config = getTimelineConfig();
    timelineStartDate = getTimelineStart();
    
    // Update zoom level display
    const zoomLabels = { hour: 'Hour', day: 'Day', week: 'Week' };
    zoomLevelDisplay.textContent = zoomLabels[config.zoom];
    
    // Get scheduled tasks (with due date)
    const filteredTasks = getFilteredTasks();
    const scheduledTasks = filteredTasks.filter(t => t.dueDate);
    
    // Render components
    renderTimelineHeader(config, timelineStartDate);
    renderTimelineSidebar(scheduledTasks);
    renderTimelineBody(scheduledTasks, config, timelineStartDate);
    renderNowIndicator(config, timelineStartDate);
    renderUnscheduledTasks();
    
    // Setup drop zones for unscheduled tasks
    setupTimelineDropZones();
}

/**
 * Setup timeline drop zones for drag and drop
 */
function setupTimelineDropZones() {
    // Only setup once to prevent duplicate listeners
    if (dropZonesInitialized) return;
    dropZonesInitialized = true;
    
    const scrollArea = timelineScrollArea;
    
    scrollArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });
    
    scrollArea.addEventListener('drop', (e) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        if (!taskId) return;
        
        // Get current config at drop time
        const config = getTimelineConfig();
        
        // Calculate drop position to date
        const rect = scrollArea.getBoundingClientRect();
        const scrollLeft = scrollArea.scrollLeft;
        const x = e.clientX - rect.left + scrollLeft;
        
        const msOffset = (x / config.cellWidth) * config.msPerCell;
        const dropDate = new Date(timelineStartDate.getTime() + msOffset);
        
        // Format as YYYY-MM-DD
        const dateString = dropDate.toISOString().split('T')[0];
        
        // Update task (this will call renderTimeline)
        updateTask(taskId, { dueDate: dateString });
    });
}

// ===== Timeline Interaction (Drag & Resize) =====
let tooltipElement = null;

/**
 * Show tooltip for task bar
 */
function showTooltip(e, task) {
    hideTooltip();
    
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'timeline-tooltip';
    
    const effort = task.effort || 1;
    const status = getTaskStatusClass(task);
    const statusLabels = {
        completed: 'Completed',
        overdue: 'Overdue',
        'due-today': 'Due Today',
        approaching: 'Approaching',
        upcoming: 'Upcoming',
        'no-date': 'No Due Date'
    };
    
    tooltipElement.innerHTML = `
        <div class="timeline-tooltip-title">${escapeHtml(task.text)}</div>
        <div class="timeline-tooltip-detail">Due: ${formatDateTimeForDisplay(task.dueDate, task.dueTime) || 'Not set'}</div>
        <div class="timeline-tooltip-detail">Effort: ${effort}h</div>
        <div class="timeline-tooltip-detail">Status: ${statusLabels[status]}</div>
    `;
    
    document.body.appendChild(tooltipElement);
    
    // Position tooltip
    const rect = e.target.getBoundingClientRect();
    tooltipElement.style.left = `${rect.left}px`;
    tooltipElement.style.top = `${rect.bottom + 5}px`;
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    if (tooltipElement) {
        tooltipElement.remove();
        tooltipElement = null;
    }
}

/**
 * Handle mouse down on task bar
 */
function handleBarMouseDown(e, task, config, startTime) {
    if (e.target.classList.contains('timeline-bar-handle')) {
        // Start resize
        isResizing = true;
        resizeHandle = e.target.dataset.handle;
        dragTask = task;
        dragStartX = e.clientX;
        dragStartLeft = parseFloat(e.target.parentElement.style.left);
        dragStartWidth = parseFloat(e.target.parentElement.style.width);
    } else {
        // Start drag
        isDragging = true;
        dragTask = task;
        dragStartX = e.clientX;
        dragStartLeft = parseFloat(e.target.style.left);
    }
    
    e.target.style.cursor = isResizing ? 'ew-resize' : 'grabbing';
    
    const handleMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - dragStartX;
        const bar = document.querySelector(`.timeline-bar[data-task-id="${task.id}"]`);
        
        if (!bar) return;
        
        if (isResizing) {
            if (resizeHandle === 'right') {
                // Resize from right (change effort)
                const newWidth = Math.max(20, dragStartWidth + deltaX);
                bar.style.width = `${newWidth}px`;
            } else {
                // Resize from left (change start time and effort)
                const newLeft = dragStartLeft + deltaX;
                const newWidth = Math.max(20, dragStartWidth - deltaX);
                bar.style.left = `${newLeft}px`;
                bar.style.width = `${newWidth}px`;
            }
        } else if (isDragging) {
            const newLeft = dragStartLeft + deltaX;
            bar.style.left = `${newLeft}px`;
        }
    };
    
    const handleMouseUp = (upEvent) => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        if (!dragTask) return;
        
        const bar = document.querySelector(`.timeline-bar[data-task-id="${task.id}"]`);
        if (!bar) return;
        
        bar.style.cursor = 'grab';
        
        const finalLeft = parseFloat(bar.style.left);
        const finalWidth = parseFloat(bar.style.width);
        
        // Calculate new effort from width
        const effortMs = (finalWidth / config.cellWidth) * config.msPerCell;
        const newEffort = Math.max(0.5, Math.round((effortMs / (60 * 60 * 1000)) * 2) / 2); // Round to 0.5
        
        // Calculate new due date/time from position + width
        const endMs = ((finalLeft + finalWidth) / config.cellWidth) * config.msPerCell;
        const endDate = new Date(startTime.getTime() + endMs);
        const newDueDate = endDate.toISOString().split('T')[0];
        const newDueTime = endDate.getHours().toString().padStart(2, '0') + ':' + 
                          (Math.round(endDate.getMinutes() / 30) * 30).toString().padStart(2, '0');
        
        // Update task
        const updates = {};
        if (isDragging || isResizing) {
            updates.dueDate = newDueDate;
            if (config.zoom === 'hour') {
                updates.dueTime = newDueTime === '24:00' ? '23:30' : newDueTime;
            }
        }
        if (isResizing) {
            updates.effort = newEffort;
        }
        
        if (Object.keys(updates).length > 0) {
            updateTask(task.id, updates);
        }
        
        isDragging = false;
        isResizing = false;
        dragTask = null;
        resizeHandle = null;
        
        renderTimeline();
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

/**
 * Handle touch start on task bar (mobile)
 */
function handleBarTouchStart(e, task, config, startTime) {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    const fakeMouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        target: e.target,
        preventDefault: () => e.preventDefault()
    };
    
    handleBarMouseDown(fakeMouseEvent, task, config, startTime);
}

/**
 * Setup timeline zoom controls
 */
function setupTimelineZoom() {
    zoomButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const direction = btn.dataset.zoom;
            if (direction === 'in' && currentZoomLevel > 0) {
                currentZoomLevel--;
            } else if (direction === 'out' && currentZoomLevel < ZOOM_LEVELS.length - 1) {
                currentZoomLevel++;
            }
            renderTimeline();
        });
    });
}

/**
 * Setup timeline navigation controls
 */
function setupTimelineNav() {
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.nav;
            const config = getTimelineConfig();
            
            if (action === 'today') {
                timelineStartDate = getTimelineStart();
            } else if (action === 'prev') {
                timelineStartDate = new Date(timelineStartDate.getTime() - (config.cellCount / 2 * config.msPerCell));
            } else if (action === 'next') {
                timelineStartDate = new Date(timelineStartDate.getTime() + (config.cellCount / 2 * config.msPerCell));
            }
            
            renderTimeline();
        });
    });
}

// ===== Initialization =====
function init() {
    loadTheme();
    loadTasks();
    loadView();
    loadCollapsedSections();
    setupCollapsibleSections();
    setupViewToggle();
    setupTimelineZoom();
    setupTimelineNav();
    
    // Sync sidebar scroll with timeline scroll area
    timelineScrollArea.addEventListener('scroll', () => {
        timelineSidebar.scrollTop = timelineScrollArea.scrollTop;
    });
    
    // Apply saved view
    setView(currentView);
    renderTasks();
    
    // Track the current date to detect date changes
    let lastDateString = getTodayString();
    
    // Periodically check for time-based reminders and date changes (every minute)
    setInterval(() => {
        const currentDateString = getTodayString();
        
        // If the date has changed (e.g., crossed midnight), re-render all tasks
        if (currentDateString !== lastDateString) {
            lastDateString = currentDateString;
            renderTasks();
            if (currentView === 'timeline') {
                renderTimeline();
            }
            return;
        }
        
        // Re-render if there are any tasks with time-based urgency
        const hasUpcomingTasks = tasks.some(t => getTimeStatus(t) !== null);
        if (hasUpcomingTasks) {
            renderTasks();
        }
        
        // Update now indicator in timeline
        if (currentView === 'timeline') {
            const config = getTimelineConfig();
            renderNowIndicator(config, timelineStartDate);
        }
    }, 60000); // Check every minute
    
    // Focus on input for immediate use
    taskInput.focus();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
