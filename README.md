# Task Manager

A modern, feature-rich task management web application with timeline visualization, due date tracking, and smart notifications.

![Task Manager](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Live Demo

[View Live Application](https://mgitonga.github.io/Task-Manager/)

## Features

### Core Task Management
- **Create Tasks** - Add tasks with optional due dates, times, and effort estimates
- **Edit Tasks** - Modify task details inline
- **Delete Tasks** - Remove tasks with confirmation
- **Complete Tasks** - Mark tasks as done with visual feedback

### Smart Due Date Tracking
Tasks are automatically color-coded based on their due status:
- 🔴 **Overdue** (Pink) - Past due date
- 🟠 **Approaching** (Orange) - Due within 3 days
- 🔵 **Due Today** (Blue) - Due today
- 🟢 **Completed** (Green) - Finished tasks

### Organized Task Sections
Tasks are automatically grouped into collapsible sections:
- **Past Due** - Overdue tasks requiring attention
- **Due Today** - Tasks due today
- **Upcoming** - Future tasks
- **Completed** - Finished tasks

### Gantt Chart Timeline View
Visual timeline for project planning:
- **Multiple Zoom Levels** - Hour, Day, Week views
- **Drag to Reschedule** - Move tasks by dragging
- **Resize for Effort** - Adjust task duration by resizing
- **Now Indicator** - Current time marker
- **Unscheduled Tasks** - Drop zone for tasks without dates

### Additional Features
- **Dark Mode** - Toggle between light and dark themes
- **Effort Tracking** - Estimate task duration in hours
- **Time-Based Reminders** - Visual alerts for approaching deadlines
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Local Storage** - Data persists in your browser
- **Keyboard Accessible** - Full keyboard navigation support

## Usage

### Adding a Task

1. Enter task description in the text field
2. (Optional) Select a due date
3. (Optional) Choose a due time
4. (Optional) Enter effort estimate in hours
5. Click "Add Task" or press Enter

**Example:**
```
Task: "Prepare presentation"
Due Date: 2026-02-25
Due Time: 14:00
Effort: 4 hours
```

### Using the Timeline View

1. Click "Timeline" button to switch views
2. Use zoom controls (Hour/Day/Week) to adjust granularity
3. Navigate with ← → arrows
4. Drag task bars to reschedule
5. Resize bars from handles to adjust effort

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Add task (when in input field) |
| `Tab` | Navigate between elements |
| `Space/Enter` | Toggle task completion |
| `Delete` | Remove task (when focused) |

## Technical Details

### Built With
- **HTML5** - Semantic markup with ARIA accessibility
- **CSS3** - Custom properties, Grid, Flexbox, animations
- **Vanilla JavaScript** - ES6+ features, no dependencies

### Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Data Storage
All tasks are stored locally in your browser using `localStorage`. Data is specific to each browser/device and does not sync across devices.

## Project Structure

```
├── index.html          # Main HTML structure
├── styles.css          # All styling (responsive, dark mode, timeline)
├── script.js           # Application logic
├── README.md           # Documentation
└── .github/
    └── workflows/
        └── deploy.yml  # GitHub Pages deployment
```

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/mgitonga/Task-Manager.git
   ```

2. Open `index.html` in your browser, or use a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve
   ```

3. Visit `http://localhost:8000`

## Deployment

The application automatically deploys to GitHub Pages when changes are pushed to the `main` branch.

## Screenshots

### List View (Light Mode)
Tasks organized by due date status with filtering options.

### Timeline View (Dark Mode)
Gantt chart visualization with drag-and-drop scheduling.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Icons from system emoji
- Color palette inspired by Tailwind CSS
- Design patterns from modern productivity apps
