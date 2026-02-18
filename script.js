/**
 * Task Manager Application
 * A simple, accessible task management app with local storage persistence
 */

// ===== DOM Elements =====
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const dueDateInput = document.getElementById('due-date-input');
const dueTimeInput = document.getElementById('due-time-input');
const taskList = document.getElementById('task-list');
const dueTodayList = document.getElementById('due-today-list');
const dueTodaySection = document.getElementById('due-today-section');
const emptyState = document.getElementById('empty-state');
const clearCompletedBtn = document.getElementById('clear-completed');
const filterButtons = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('theme-toggle');

// Count elements
const countAll = document.getElementById('count-all');
const countActive = document.getElementById('count-active');
const countCompleted = document.getElementById('count-completed');
const countDueToday = document.getElementById('count-due-today');

// ===== State =====
let tasks = [];
let currentFilter = 'all';

// ===== Local Storage =====
const STORAGE_KEY = 'taskManager_tasks';
const THEME_KEY = 'taskManager_theme';

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
 */
function addTask(text, dueDate = null, dueTime = null) {
    const task = {
        id: generateId(),
        text: text.trim(),
        completed: false,
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        createdAt: new Date().toISOString()
    };
    
    tasks.unshift(task); // Add to beginning of array
    saveTasks();
    renderTasks();
    const dueDateTimeStr = formatDateTimeForDisplay(dueDate, dueTime);
    announceToScreenReader(`Task "${text}" added${dueDateTimeStr ? ` due ${dueDateTimeStr}` : ''}`);
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
                dueTime: editTime.value || null
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

/**
 * Clear all completed tasks
 */
function clearCompleted() {
    const completedCount = tasks.filter(t => t.completed).length;
    if (completedCount > 0) {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
        renderTasks();
        announceToScreenReader(`${completedCount} completed task${completedCount > 1 ? 's' : ''} cleared`);
    }
}

// ===== Due Date Helpers =====
/**
 * Get today's date as YYYY-MM-DD string
 * @returns {string} Today's date
 */
function getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

/**
 * Get the due date status of a task
 * @param {Object} task - Task object
 * @returns {string|null} 'overdue', 'approaching', 'due-today', or null
 */
function getDueDateStatus(task) {
    if (!task.dueDate || task.completed) return null;

    // Use UTC-based dates to avoid timezone-related off-by-one errors
    const now = new Date();
    const todayUtc = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
    ));

    const [yearStr, monthStr, dayStr] = task.dueDate.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1; // Month is zero-based in Date.UTC
    const day = Number(dayStr);

    // Guard against invalid date components
    if (Number.isNaN(year) || Number.isNaN(monthIndex) || Number.isNaN(day)) {
        return null;
    }

    const dueDateUtc = new Date(Date.UTC(year, monthIndex, day));
    const diffTime = dueDateUtc.getTime() - todayUtc.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    
    // Update counts
    updateCounts();
    
    // Get tasks due today (not completed)
    const tasksDueToday = tasks.filter(t => isDueToday(t));
    
    // Show/hide Due Today section
    if (tasksDueToday.length > 0) {
        dueTodaySection.classList.remove('hidden');
        tasksDueToday.forEach(task => {
            dueTodayList.appendChild(createTaskElement(task));
        });
    } else {
        dueTodaySection.classList.add('hidden');
    }
    
    // Filter out tasks that are shown in Due Today section (to avoid duplicates)
    const mainListTasks = filteredTasks.filter(t => !isDueToday(t));
    
    // Show/hide empty state
    if (mainListTasks.length === 0 && tasksDueToday.length === 0) {
        emptyState.classList.remove('hidden');
        taskList.setAttribute('aria-hidden', 'true');
    } else {
        emptyState.classList.add('hidden');
        taskList.removeAttribute('aria-hidden');
        
        // Render each task in main list
        mainListTasks.forEach(task => {
            taskList.appendChild(createTaskElement(task));
        });
    }
    
    // Update clear completed button state
    const hasCompleted = tasks.some(t => t.completed);
    clearCompletedBtn.disabled = !hasCompleted;
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
            ${dueDateHtml}
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
    
    countAll.textContent = all;
    countActive.textContent = active;
    countCompleted.textContent = completed;
    countDueToday.textContent = dueToday;
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
    addTask(text, dueDate, dueTime);
    taskInput.value = '';
    dueDateInput.value = '';
    dueTimeInput.value = '';
    taskInput.focus();
});

// Filter buttons
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// Clear completed button
clearCompletedBtn.addEventListener('click', clearCompleted);

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

// ===== Initialization =====
function init() {
    loadTheme();
    loadTasks();
    renderTasks();
    
    // Periodically check for time-based reminders (every minute)
    setInterval(() => {
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
