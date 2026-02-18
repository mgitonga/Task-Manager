/**
 * Task Manager Application
 * A simple, accessible task management app with local storage persistence
 */

// ===== DOM Elements =====
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const dueDateInput = document.getElementById('due-date-input');
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
 */
function addTask(text, dueDate = null) {
    const task = {
        id: generateId(),
        text: text.trim(),
        completed: false,
        dueDate: dueDate || null,
        createdAt: new Date().toISOString()
    };
    
    tasks.unshift(task); // Add to beginning of array
    saveTasks();
    renderTasks();
    announceToScreenReader(`Task "${text}" added${dueDate ? ` with due date ${formatDateForDisplay(dueDate)}` : ''}`);
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
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDate = new Date(task.dueDate + 'T00:00:00');
    const diffTime = dueDate.getTime() - today.getTime();
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
    let className = 'task-item';
    if (task.completed) className += ' completed';
    if (dueDateStatus) className += ` ${dueDateStatus}`;
    li.className = className;
    li.dataset.id = task.id;
    
    // Build due date badge HTML
    let dueDateHtml = '';
    if (task.dueDate) {
        const statusClass = dueDateStatus ? ` ${dueDateStatus}` : '';
        const formattedDate = formatDateForDisplay(task.dueDate);
        dueDateHtml = `
            <span class="due-date-badge${statusClass}" aria-label="Due ${formattedDate}">
                <span class="due-icon" aria-hidden="true">📅</span>
                ${formattedDate}
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
        <button 
            class="delete-btn" 
            aria-label="Delete task: ${escapeHtml(task.text)}"
            title="Delete task"
        >
            ×
        </button>
    `;
    
    // Add event listeners
    const checkbox = li.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => toggleTask(task.id));
    
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
    addTask(text, dueDate);
    taskInput.value = '';
    dueDateInput.value = '';
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
    
    // Focus on input for immediate use
    taskInput.focus();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
