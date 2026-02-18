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

// ===== Local Storage =====
const STORAGE_KEY = 'taskManager_tasks';
const THEME_KEY = 'taskManager_theme';
const COLLAPSED_KEY = 'taskManager_collapsed';

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

// ===== Initialization =====
function init() {
    loadTheme();
    loadTasks();
    loadCollapsedSections();
    setupCollapsibleSections();
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
            return;
        }
        
        // Re-render if there are any tasks with time-based urgency
        const hasUpcomingTasks = tasks.some(t => getTimeStatus(t) !== null);
        if (hasUpcomingTasks) {
            renderTasks();
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
