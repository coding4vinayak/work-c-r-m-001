// Tasks Page JavaScript for ABETWORKS WORKCRM

document.addEventListener('DOMContentLoaded', function() {
  // Initialize tasks page if on the right page
  if (window.location.pathname.includes('/task/') || window.location.pathname.includes('/apps-tasks.html')) {
    loadTasks();
  }
});

// Load tasks list
async function loadTasks() {
  try {
    // Show loading state
    const tasksContainer = document.getElementById('tasksList');
    if (tasksContainer) {
      tasksContainer.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }
    
    // Fetch tasks from API
    const response = await apiService.getTasks({
      page: 1,
      limit: 50
    });
    
    if (response.data && Array.isArray(response.data)) {
      renderTasksList(response.data);
    } else {
      console.error('Invalid response format:', response);
      showError('Failed to load tasks data');
    }
  } catch (error) {
    console.error('Error loading tasks:', error);
    showError('Failed to load tasks: ' + (error.message || 'Unknown error'));
  }
}

// Render tasks list
function renderTasksList(tasks) {
  const tasksContainer = document.getElementById('tasksList');
  if (!tasksContainer) return;
  
  if (tasks.length === 0) {
    tasksContainer.innerHTML = '<div class="alert alert-info">No tasks found. Create your first task.</div>';
    return;
  }
  
  // Clear container
  tasksContainer.innerHTML = '';
  
  // Create table
  const table = document.createElement('table');
  table.className = 'table table-striped table-hover';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Title</th>
        <th>Description</th>
        <th>Priority</th>
        <th>Due Date</th>
        <th>Assigned To</th>
        <th>Status</th>
        <th>Created</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="tasksTableBody">
    </tbody>
  `;
  
  tasksContainer.appendChild(table);
  
  // Populate table rows
  const tbody = document.getElementById('tasksTableBody');
  tasks.forEach(task => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="form-check">
          <input class="form-check-input" type="checkbox" id="task-${task.id}" ${task.completed ? 'checked' : ''} onchange="toggleTaskCompletion('${task.id}', this.checked)">
          <label class="form-check-label" for="task-${task.id}">
            <strong>${escapeHtml(task.title || '')}</strong>
          </label>
        </div>
      </td>
      <td>${truncateText(escapeHtml(task.description || ''), 50)}</td>
      <td>
        <span class="badge ${getPriorityBadgeClass(task.priority)}">${escapeHtml(task.priority || 'medium')}</span>
      </td>
      <td>${formatDate(task.due_date)}</td>
      <td>${task.assigned_to ? 'Assigned' : 'Unassigned'}</td>
      <td>
        <span class="badge ${task.completed ? 'bg-success' : 'bg-warning'}">${task.completed ? 'Completed' : 'Pending'}</span>
      </td>
      <td>${formatDate(task.created_at)}</td>
      <td>
        <div class="dropdown">
          <a href="#" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-boundary="viewport" data-bs-toggle="dropdown" aria-expanded="false">
            Actions
          </a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="#" onclick="editTask('${task.id}')"><i class="feather-edit me-2"></i>Edit</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" onclick="deleteTask('${task.id}', '${escapeHtml(task.title || '')}')"><i class="feather-trash-2 me-2"></i>Delete</a></li>
          </ul>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Helper function to truncate text
function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// Helper function to get priority badge class
function getPriorityBadgeClass(priority) {
  switch (priority?.toLowerCase()) {
    case 'low':
      return 'bg-success';
    case 'medium':
      return 'bg-warning';
    case 'high':
      return 'bg-danger';
    case 'urgent':
      return 'bg-dark';
    default:
      return 'bg-secondary';
  }
}

// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Toggle task completion
async function toggleTaskCompletion(taskId, isCompleted) {
  try {
    // Update the task status
    const task = await apiService.getTask(taskId);
    const updatedTask = {
      ...task,
      completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null
    };
    
    await apiService.updateTask(taskId, updatedTask);
    
    // Show success message
    showSuccess(isCompleted ? 'Task marked as completed!' : 'Task marked as pending!');
    
    // Reload the tasks list
    loadTasks();
  } catch (error) {
    console.error('Error updating task completion:', error);
    showError('Failed to update task status: ' + (error.message || 'Unknown error'));
    
    // Revert the checkbox state
    const checkbox = document.getElementById(`task-${taskId}`);
    if (checkbox) {
      checkbox.checked = !isCompleted;
    }
  }
}

// Edit task function
function editTask(taskId) {
  // For now, redirect to a hypothetical edit page
  // In a real implementation, you might open a modal or redirect to an edit form
  alert('Edit functionality would be implemented here. Task ID: ' + taskId);
}

// Delete task function
async function deleteTask(taskId, taskName) {
  if (!confirm(`Are you sure you want to delete task "${taskName}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    await apiService.deleteTask(taskId);
    showSuccess('Task deleted successfully!');
    
    // Reload the tasks list
    loadTasks();
  } catch (error) {
    console.error('Error deleting task:', error);
    showError('Failed to delete task: ' + (error.message || 'Unknown error'));
  }
}

// Show error message
function showError(message) {
  // Remove any existing alerts
  const existingAlerts = document.querySelectorAll('.alert');
  existingAlerts.forEach(alert => alert.remove());
  
  // Create new alert
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-danger alert-dismissible fade show';
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    <strong>Error!</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  // Insert at the top of the main content
  const mainContent = document.querySelector('.main-content') || document.querySelector('.container-fluid') || document.body;
  mainContent.insertBefore(alertDiv, mainContent.firstChild);
}

// Show success message
function showSuccess(message) {
  // Remove any existing alerts
  const existingAlerts = document.querySelectorAll('.alert');
  existingAlerts.forEach(alert => alert.remove());
  
  // Create new alert
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-success alert-dismissible fade show';
  alertDiv.setAttribute('role', 'alert');
  alertDiv.innerHTML = `
    <strong>Success!</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  // Insert at the top of the main content
  const mainContent = document.querySelector('.main-content') || document.querySelector('.container-fluid') || document.body;
  mainContent.insertBefore(alertDiv, mainContent.firstChild);
}

// Function to add a new task (if there's a form for it)
function setupTaskCreationForm() {
  const form = document.getElementById('taskForm');
  if (!form) return;
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
      title: document.getElementById('taskTitle').value.trim(),
      description: document.getElementById('taskDescription').value.trim(),
      priority: document.getElementById('taskPriority').value,
      due_date: document.getElementById('taskDueDate').value,
      assigned_to: document.getElementById('taskAssignedTo').value
    };
    
    // Validation
    if (!formData.title) {
      showError('Task title is required');
      return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Creating...';
    submitButton.disabled = true;
    
    try {
      // Create new task
      const result = await apiService.createTask(formData);
      showSuccess('Task created successfully!');
      
      // Reset form
      form.reset();
      
      // Reload tasks list
      loadTasks();
      
    } catch (error) {
      console.error('Error creating task:', error);
      showError('Failed to create task: ' + (error.message || 'Unknown error'));
    } finally {
      submitButton.innerHTML = originalText;
      submitButton.disabled = false;
    }
  });
}

// Initialize task creation form if it exists
document.addEventListener('DOMContentLoaded', function() {
  if (document.getElementById('taskForm')) {
    setupTaskCreationForm();
  }
});