// Dashboard Page JavaScript for ABETWORKS WORKCRM

document.addEventListener('DOMContentLoaded', function() {
  // Initialize dashboard if on the right page
  if (window.location.pathname.includes('/dashboard/') || window.location.pathname === '/') {
    loadDashboardData();
  }
});

// Load dashboard data
async function loadDashboardData() {
  try {
    // Show loading state
    showDashboardLoading();
    
    // Fetch dashboard analytics from API
    // Note: The backend doesn't have a specific dashboard endpoint yet, so we'll fetch individual data
    const [customers, leads, deals, tasks] = await Promise.allSettled([
      apiService.getCustomers({ limit: 5 }),
      apiService.getLeads({ limit: 5 }),
      apiService.getDeals({ limit: 5 }),
      apiService.getTasks({ limit: 5 })
    ]);
    
    // Process results
    const customerData = customers.status === 'fulfilled' ? customers.value : null;
    const leadData = leads.status === 'fulfilled' ? leads.value : null;
    const dealData = deals.status === 'fulfilled' ? deals.value : null;
    const taskData = tasks.status === 'fulfilled' ? tasks.value : null;
    
    // Render dashboard sections
    renderRecentCustomers(customerData);
    renderRecentLeads(leadData);
    renderRecentDeals(dealData);
    renderRecentTasks(taskData);
    
    // Initialize charts if they exist
    initializeDashboardCharts();
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showError('Failed to load dashboard data: ' + (error.message || 'Unknown error'));
  }
}

// Show loading state on dashboard
function showDashboardLoading() {
  const dashboardSections = document.querySelectorAll('.dashboard-section');
  dashboardSections.forEach(section => {
    section.innerHTML = '<div class="text-center p-4"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
  });
}

// Render recent customers section
function renderRecentCustomers(customerData) {
  const container = document.getElementById('recentCustomers');
  if (!container) return;
  
  if (!customerData || !customerData.data || customerData.data.length === 0) {
    container.innerHTML = '<div class="text-center p-4 text-muted">No recent customers</div>';
    return;
  }
  
  let html = '<div class="list-group list-group-flush">';
  customerData.data.slice(0, 5).forEach(customer => {
    html += `
      <a href="/customer/customers-view.html?id=${customer.id}" class="list-group-item list-group-item-action">
        <div class="d-flex w-100 justify-content-between">
          <h6 class="mb-1">${escapeHtml(customer.first_name || '')} ${escapeHtml(customer.last_name || '')}</h6>
          <small>${formatDate(customer.created_at)}</small>
        </div>
        <p class="mb-1">${escapeHtml(customer.company || '')}</p>
        <small>${escapeHtml(customer.email || '')}</small>
      </a>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
}

// Render recent leads section
function renderRecentLeads(leadData) {
  const container = document.getElementById('recentLeads');
  if (!container) return;
  
  if (!leadData || !leadData.data || leadData.data.length === 0) {
    container.innerHTML = '<div class="text-center p-4 text-muted">No recent leads</div>';
    return;
  }
  
  let html = '<div class="list-group list-group-flush">';
  leadData.data.slice(0, 5).forEach(lead => {
    html += `
      <a href="/lead/leads-view.html?id=${lead.id}" class="list-group-item list-group-item-action">
        <div class="d-flex w-100 justify-content-between">
          <h6 class="mb-1">${escapeHtml(lead.first_name || '')} ${escapeHtml(lead.last_name || '')}</h6>
          <small class="text-${getStatusColor(lead.status)}">${escapeHtml(lead.status || 'N/A')}</small>
        </div>
        <p class="mb-1">${escapeHtml(lead.company || '')}</p>
        <small>${formatDate(lead.created_at)}</small>
      </a>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
}

// Render recent deals section
function renderRecentDeals(dealData) {
  const container = document.getElementById('recentDeals');
  if (!container) return;
  
  if (!dealData || !dealData.data || dealData.data.length === 0) {
    container.innerHTML = '<div class="text-center p-4 text-muted">No recent deals</div>';
    return;
  }
  
  let html = '<div class="list-group list-group-flush">';
  dealData.data.slice(0, 5).forEach(deal => {
    html += `
      <a href="/deal/projects-view.html?id=${deal.id}" class="list-group-item list-group-item-action">
        <div class="d-flex w-100 justify-content-between">
          <h6 class="mb-1">${escapeHtml(deal.title || '')}</h6>
          <small>$${deal.value ? parseFloat(deal.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</small>
        </div>
        <p class="mb-1">${escapeHtml(deal.pipeline || '')}</p>
        <small class="text-${getStatusColor(deal.status || deal.stage_id)}">${escapeHtml(deal.stage_name || deal.stage_id || 'N/A')}</small>
      </a>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
}

// Render recent tasks section
function renderRecentTasks(taskData) {
  const container = document.getElementById('recentTasks');
  if (!container) return;
  
  if (!taskData || !taskData.data || taskData.data.length === 0) {
    container.innerHTML = '<div class="text-center p-4 text-muted">No recent tasks</div>';
    return;
  }
  
  let html = '<div class="list-group list-group-flush">';
  taskData.data.slice(0, 5).forEach(task => {
    html += `
      <div class="list-group-item">
        <div class="d-flex w-100 justify-content-between">
          <h6 class="mb-1">${escapeHtml(task.title || '')}</h6>
          <small class="text-${task.completed ? 'success' : 'warning'}">${task.completed ? 'Completed' : 'Pending'}</small>
        </div>
        <p class="mb-1">${truncateText(escapeHtml(task.description || ''), 50)}</p>
        <small>${formatDate(task.due_date || task.created_at)}</small>
      </div>
    `;
  });
  html += '</div>';
  
  container.innerHTML = html;
}

// Initialize dashboard charts
function initializeDashboardCharts() {
  // Check if ApexCharts is available
  if (typeof ApexCharts !== 'undefined') {
    // Initialize sample chart data
    const chartData = {
      series: [{
        name: 'Revenue',
        data: [31, 40, 28, 51, 42, 109, 100]
      }],
      chartOptions: {
        chart: {
          height: 350,
          type: 'area'
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: 'smooth'
        },
        xaxis: {
          type: 'datetime',
          categories: [
            "2023-01-01", "2023-02-01", "2023-03-01", 
            "2023-04-01", "2023-05-01", "2023-06-01", 
            "2023-07-01"
          ]
        },
        tooltip: {
          x: {
            format: 'dd/MM/yy HH:mm'
          }
        }
      }
    };
    
    // Render chart if container exists
    const chartContainer = document.getElementById('revenueChart');
    if (chartContainer) {
      const chart = new ApexCharts(chartContainer, {
        chart: {
          height: 350,
          type: 'area'
        },
        dataLabels: {
          enabled: false
        },
        stroke: {
          curve: 'smooth'
        },
        series: [{
          name: 'Revenue',
          data: [31, 40, 28, 51, 42, 109, 100]
        }],
        xaxis: {
          type: 'datetime',
          categories: [
            "2023-01-01T00:00:00", "2023-02-01T00:00:00", "2023-03-01T00:00:00",
            "2023-04-01T00:00:00", "2023-05-01T00:00:00", "2023-06-01T00:00:00",
            "2023-07-01T00:00:00"
          ]
        }
      });
      
      chart.render();
    }
  }
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

// Helper function to get status color
function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'new':
    case 'lead':
      return 'primary';
    case 'contacted':
    case 'qualified':
      return 'warning';
    case 'closed_won':
    case 'customer':
      return 'success';
    case 'closed_lost':
    case 'inactive':
      return 'danger';
    default:
      return 'secondary';
  }
}

// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Helper function to truncate text
function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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

// Refresh dashboard data
function refreshDashboard() {
  loadDashboardData();
}