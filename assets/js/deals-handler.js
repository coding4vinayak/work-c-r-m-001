// Deals Page JavaScript for ABETWORKS WORKCRM

document.addEventListener('DOMContentLoaded', function() {
  // Initialize deals page if on the right page
  if (window.location.pathname.includes('/deal/')) {
    loadDeals();
  }
  
  // Handle deal creation form if on create page
  if (window.location.pathname.includes('/deal/projects-create.html')) {
    setupDealCreationForm();
  }
  
  // Handle deal view page
  if (window.location.pathname.includes('/deal/projects-view.html')) {
    loadDealDetails();
  }
});

// Load deals list
async function loadDeals() {
  try {
    // Show loading state
    const dealsContainer = document.getElementById('dealsList');
    if (dealsContainer) {
      dealsContainer.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }
    
    // Fetch deals from API
    const response = await apiService.getDeals({
      page: 1,
      limit: 50
    });
    
    if (response.data && Array.isArray(response.data)) {
      renderDealsList(response.data);
    } else {
      console.error('Invalid response format:', response);
      showError('Failed to load deals data');
    }
  } catch (error) {
    console.error('Error loading deals:', error);
    showError('Failed to load deals: ' + (error.message || 'Unknown error'));
  }
}

// Render deals list
function renderDealsList(deals) {
  const dealsContainer = document.getElementById('dealsList');
  if (!dealsContainer) return;
  
  if (deals.length === 0) {
    dealsContainer.innerHTML = '<div class="alert alert-info">No deals found. <a href="/deal/projects-create.html">Create your first deal</a>.</div>';
    return;
  }
  
  // Clear container
  dealsContainer.innerHTML = '';
  
  // Create table
  const table = document.createElement('table');
  table.className = 'table table-striped table-hover';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Title</th>
        <th>Customer</th>
        <th>Value</th>
        <th>Stage</th>
        <th>Probability</th>
        <th>Expected Close</th>
        <th>Created</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="dealsTableBody">
    </tbody>
  `;
  
  dealsContainer.appendChild(table);
  
  // Populate table rows
  const tbody = document.getElementById('dealsTableBody');
  deals.forEach(deal => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <div class="flex-grow-1">
            <h6 class="mb-0">${escapeHtml(deal.title || '')}</h6>
            <small class="text-muted">${escapeHtml(deal.pipeline || '')}</small>
          </div>
        </div>
      </td>
      <td>${deal.customer_id ? 'Customer Assigned' : 'No Customer'}</td>
      <td>$${deal.value ? parseFloat(deal.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
      <td>
        <span class="badge bg-primary">${escapeHtml(deal.stage_name || deal.stage_id || 'N/A')}</span>
      </td>
      <td>${deal.probability || 0}%</td>
      <td>${formatDate(deal.expected_close_date)}</td>
      <td>${formatDate(deal.created_at)}</td>
      <td>
        <div class="dropdown">
          <a href="#" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-boundary="viewport" data-bs-toggle="dropdown" aria-expanded="false">
            Actions
          </a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="/deal/projects-view.html?id=${deal.id}"><i class="feather-eye me-2"></i>View</a></li>
            <li><a class="dropdown-item" href="/deal/projects-create.html?id=${deal.id}"><i class="feather-edit me-2"></i>Edit</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" onclick="deleteDeal('${deal.id}', '${escapeHtml(deal.title || '')}')"><i class="feather-trash-2 me-2"></i>Delete</a></li>
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

// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Setup deal creation form
function setupDealCreationForm() {
  const form = document.getElementById('dealForm');
  if (!form) return;
  
  // Check if we're editing an existing deal
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('id');
  
  if (dealId) {
    // Load deal data for editing
    loadDealForEdit(dealId);
  }
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
      title: document.getElementById('title').value.trim(),
      description: document.getElementById('description').value.trim(),
      value: parseFloat(document.getElementById('value').value) || 0,
      currency: document.getElementById('currency').value || 'USD',
      probability: parseInt(document.getElementById('probability').value) || 0,
      expected_close_date: document.getElementById('expectedCloseDate').value,
      pipeline: document.getElementById('pipeline').value.trim(),
      stage_id: document.getElementById('stage').value,
      customer_id: document.getElementById('customer').value,
      assigned_to: document.getElementById('assignedTo').value,
      tags: document.getElementById('tags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
    };
    
    // Validation
    if (!formData.title) {
      showError('Title is required');
      return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Saving...';
    submitButton.disabled = true;
    
    try {
      let result;
      if (dealId) {
        // Update existing deal
        result = await apiService.updateDeal(dealId, formData);
        showSuccess('Deal updated successfully!');
      } else {
        // Create new deal
        result = await apiService.createDeal(formData);
        showSuccess('Deal created successfully!');
      }
      
      // Redirect to deals list after a delay
      setTimeout(() => {
        window.location.href = '/deal/projects.html';
      }, 1500);
      
    } catch (error) {
      console.error('Error saving deal:', error);
      showError('Failed to save deal: ' + (error.message || 'Unknown error'));
    } finally {
      submitButton.innerHTML = originalText;
      submitButton.disabled = false;
    }
  });
}

// Load deal data for editing
async function loadDealForEdit(dealId) {
  try {
    const deal = await apiService.getDeal(dealId);
    
    // Fill form fields
    document.getElementById('title').value = deal.title || '';
    document.getElementById('description').value = deal.description || '';
    document.getElementById('value').value = deal.value || '';
    document.getElementById('currency').value = deal.currency || 'USD';
    document.getElementById('probability').value = deal.probability || '';
    document.getElementById('expectedCloseDate').value = deal.expected_close_date || '';
    document.getElementById('pipeline').value = deal.pipeline || '';
    document.getElementById('stage').value = deal.stage_id || '';
    document.getElementById('customer').value = deal.customer_id || '';
    document.getElementById('assignedTo').value = deal.assigned_to || '';
    document.getElementById('tags').value = deal.tags ? deal.tags.join(', ') : '';
    
    // Update form title
    const formTitle = document.querySelector('.card-title');
    if (formTitle) {
      formTitle.textContent = 'Edit Deal';
    }
    
    // Update button text
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Update Deal';
    }
  } catch (error) {
    console.error('Error loading deal for edit:', error);
    showError('Failed to load deal data: ' + (error.message || 'Unknown error'));
  }
}

// Load deal details for view page
async function loadDealDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('id');
  
  if (!dealId) {
    showError('Deal ID not provided');
    return;
  }
  
  try {
    const deal = await apiService.getDeal(dealId);
    renderDealDetails(deal);
  } catch (error) {
    console.error('Error loading deal details:', error);
    showError('Failed to load deal details: ' + (error.message || 'Unknown error'));
  }
}

// Render deal details
function renderDealDetails(deal) {
  const detailsContainer = document.getElementById('dealDetails');
  if (!detailsContainer) return;
  
  detailsContainer.innerHTML = `
    <div class="row mb-4">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Deal Information</h5>
          </div>
          <div class="card-body">
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Title:</strong></div>
              <div class="col-sm-8">${escapeHtml(deal.title || '')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Description:</strong></div>
              <div class="col-sm-8">${escapeHtml(deal.description || '')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Value:</strong></div>
              <div class="col-sm-8">$${deal.value ? parseFloat(deal.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Currency:</strong></div>
              <div class="col-sm-8">${escapeHtml(deal.currency || 'USD')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Probability:</strong></div>
              <div class="col-sm-8">${deal.probability || 0}%</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Pipeline:</strong></div>
              <div class="col-sm-8">${escapeHtml(deal.pipeline || 'N/A')}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Deal Status</h5>
          </div>
          <div class="card-body">
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Stage:</strong></div>
              <div class="col-sm-8"><span class="badge bg-primary">${escapeHtml(deal.stage_name || deal.stage_id || 'N/A')}</span></div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Expected Close:</strong></div>
              <div class="col-sm-8">${deal.expected_close_date || 'N/A'}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Actual Close:</strong></div>
              <div class="col-sm-8">${deal.actual_close_date || 'N/A'}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Tags:</strong></div>
              <div class="col-sm-8">${deal.tags ? deal.tags.map(tag => `<span class="badge bg-secondary me-1">${escapeHtml(tag)}</span>`).join('') : 'None'}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Assigned To:</strong></div>
              <div class="col-sm-8">${deal.assigned_to ? 'User Assigned' : 'Unassigned'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Customer Information</h5>
          </div>
          <div class="card-body">
            <p>Customer details would be displayed here based on customer_id: ${deal.customer_id || 'Not assigned'}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-3">
      <a href="/deal/projects-create.html?id=${deal.id}" class="btn btn-primary me-2">Edit Deal</a>
      <button class="btn btn-danger" onclick="deleteDeal('${deal.id}', '${escapeHtml(deal.title || '')}')">Delete Deal</button>
      <a href="/deal/projects.html" class="btn btn-secondary ms-2">Back to List</a>
    </div>
  `;
}

// Delete deal function
async function deleteDeal(dealId, dealName) {
  if (!confirm(`Are you sure you want to delete deal "${dealName}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    await apiService.deleteDeal(dealId);
    showSuccess('Deal deleted successfully!');
    
    // If on the details page, redirect to list
    if (window.location.pathname.includes('/deal/projects-view.html')) {
      setTimeout(() => {
        window.location.href = '/deal/projects.html';
      }, 1000);
    } else {
      // On list page, reload the list
      loadDeals();
    }
  } catch (error) {
    console.error('Error deleting deal:', error);
    showError('Failed to delete deal: ' + (error.message || 'Unknown error'));
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