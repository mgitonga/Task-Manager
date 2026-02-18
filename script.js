/**
 * Task Manager Application
 * A simple, accessible task management app with local storage persistence
 */

// ===== DOM Elements =====
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const clearCompletedBtn = document.getElementById('clear-completed');
const filterButtons = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('theme-toggle');

// Count elements
const countAll = document.getElementById('count-all');
const countActive = document.getElementById('count-active');
const countCompleted = document.getElementById('count-completed');

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
 */
function addTask(text) {
    const task = {
        id: generateId(),
        text: text.trim(),
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.unshift(task); // Add to beginning of array
    saveTasks();
    renderTasks();
    announceToScreenReader(`Task "${text}" added`);
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
    
    // Update counts
    updateCounts();
    
    // Show/hide empty state
    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
        taskList.setAttribute('aria-hidden', 'true');
    } else {
        emptyState.classList.add('hidden');
        taskList.removeAttribute('aria-hidden');
        
        // Render each task
        filteredTasks.forEach(task => {
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
    li.className = `task-item${task.completed ? ' completed' : ''}`;
    li.dataset.id = task.id;
    
    li.innerHTML = `
        <label class="task-checkbox">
            <input 
                type="checkbox" 
                ${task.completed ? 'checked' : ''} 
                aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}: ${escapeHtml(task.text)}"
            >
            <span class="checkmark" aria-hidden="true"></span>
        </label>
        <span class="task-text">${escapeHtml(task.text)}</span>
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
    
    countAll.textContent = all;
    countActive.textContent = active;
    countCompleted.textContent = completed;
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
    addTask(text);
    taskInput.value = '';
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
