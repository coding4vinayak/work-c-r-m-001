// Leads Page JavaScript for ABETWORKS WORKCRM

document.addEventListener('DOMContentLoaded', function() {
  // Initialize leads page if on the right page
  if (window.location.pathname.includes('/lead/')) {
    loadLeads();
  }
  
  // Handle lead creation form if on create page
  if (window.location.pathname.includes('/lead/leads-create.html')) {
    setupLeadCreationForm();
  }
  
  // Handle lead view page
  if (window.location.pathname.includes('/lead/leads-view.html')) {
    loadLeadDetails();
  }
});

// Load leads list
async function loadLeads() {
  try {
    // Show loading state
    const leadsContainer = document.getElementById('leadsList');
    if (leadsContainer) {
      leadsContainer.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }
    
    // Fetch leads from API
    const response = await apiService.getLeads({
      page: 1,
      limit: 50
    });
    
    if (response.data && Array.isArray(response.data)) {
      renderLeadsList(response.data);
    } else {
      console.error('Invalid response format:', response);
      showError('Failed to load leads data');
    }
  } catch (error) {
    console.error('Error loading leads:', error);
    showError('Failed to load leads: ' + (error.message || 'Unknown error'));
  }
}

// Render leads list
function renderLeadsList(leads) {
  const leadsContainer = document.getElementById('leadsList');
  if (!leadsContainer) return;
  
  if (leads.length === 0) {
    leadsContainer.innerHTML = '<div class="alert alert-info">No leads found. <a href="/lead/leads-create.html">Create your first lead</a>.</div>';
    return;
  }
  
  // Clear container
  leadsContainer.innerHTML = '';
  
  // Create table
  const table = document.createElement('table');
  table.className = 'table table-striped table-hover';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Company</th>
        <th>Value</th>
        <th>Status</th>
        <th>Assigned To</th>
        <th>Created</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="leadsTableBody">
    </tbody>
  `;
  
  leadsContainer.appendChild(table);
  
  // Populate table rows
  const tbody = document.getElementById('leadsTableBody');
  leads.forEach(lead => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <div class="flex-shrink-0">
            <div class="avatar-text bg-secondary">
              <span>${getInitials(lead.first_name, lead.last_name)}</span>
            </div>
          </div>
          <div class="flex-grow-1 ms-3">
            <h6 class="mb-0">${escapeHtml(lead.first_name || '')} ${escapeHtml(lead.last_name || '')}</h6>
            <small class="text-muted">${escapeHtml(lead.job_title || '')}</small>
          </div>
        </div>
      </td>
      <td>${escapeHtml(lead.email || '')}</td>
      <td>${escapeHtml(lead.company || '')}</td>
      <td>$${lead.value ? parseFloat(lead.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
      <td>
        <span class="badge ${getStatusBadgeClass(lead.status)}">${escapeHtml(lead.status || 'N/A')}</span>
      </td>
      <td>${lead.assigned_to ? 'Assigned' : 'Unassigned'}</td>
      <td>${formatDate(lead.created_at)}</td>
      <td>
        <div class="dropdown">
          <a href="#" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-boundary="viewport" data-bs-toggle="dropdown" aria-expanded="false">
            Actions
          </a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="/lead/leads-view.html?id=${lead.id}"><i class="feather-eye me-2"></i>View</a></li>
            <li><a class="dropdown-item" href="/lead/leads-create.html?id=${lead.id}"><i class="feather-edit me-2"></i>Edit</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" onclick="deleteLead('${lead.id}', '${escapeHtml(lead.first_name || '')} ${escapeHtml(lead.last_name || '')}')"><i class="feather-trash-2 me-2"></i>Delete</a></li>
          </ul>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Helper function to get initials
function getInitials(firstName, lastName) {
  const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
  const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
  return firstInitial + lastInitial;
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

// Helper function to get status badge class
function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case 'new':
      return 'bg-info';
    case 'contacted':
      return 'bg-warning';
    case 'qualified':
      return 'bg-primary';
    case 'closed_won':
      return 'bg-success';
    case 'closed_lost':
      return 'bg-danger';
    case 'working':
      return 'bg-secondary';
    default:
      return 'bg-light';
  }
}

// Helper function to format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

// Setup lead creation form
function setupLeadCreationForm() {
  const form = document.getElementById('leadForm');
  if (!form) return;
  
  // Check if we're editing an existing lead
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');
  
  if (leadId) {
    // Load lead data for editing
    loadLeadForEdit(leadId);
  }
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
      first_name: document.getElementById('firstName').value.trim(),
      last_name: document.getElementById('lastName').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      company: document.getElementById('company').value.trim(),
      job_title: document.getElementById('jobTitle').value.trim(),
      website: document.getElementById('website').value.trim(),
      address_line1: document.getElementById('addressLine1').value.trim(),
      address_line2: document.getElementById('addressLine2').value.trim(),
      city: document.getElementById('city').value.trim(),
      state: document.getElementById('state').value.trim(),
      postal_code: document.getElementById('postalCode').value.trim(),
      country: document.getElementById('country').value.trim(),
      status: document.getElementById('status').value,
      source: document.getElementById('source').value,
      notes: document.getElementById('notes').value.trim(),
      value: parseFloat(document.getElementById('value').value) || 0,
      probability: parseInt(document.getElementById('probability').value) || 0,
      expected_close_date: document.getElementById('expectedCloseDate').value
    };
    
    // Validation
    if (!formData.first_name || !formData.email) {
      showError('First name and email are required');
      return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Saving...';
    submitButton.disabled = true;
    
    try {
      let result;
      if (leadId) {
        // Update existing lead
        result = await apiService.updateLead(leadId, formData);
        showSuccess('Lead updated successfully!');
      } else {
        // Create new lead
        result = await apiService.createLead(formData);
        showSuccess('Lead created successfully!');
      }
      
      // Redirect to leads list after a delay
      setTimeout(() => {
        window.location.href = '/lead/leads.html';
      }, 1500);
      
    } catch (error) {
      console.error('Error saving lead:', error);
      showError('Failed to save lead: ' + (error.message || 'Unknown error'));
    } finally {
      submitButton.innerHTML = originalText;
      submitButton.disabled = false;
    }
  });
}

// Load lead data for editing
async function loadLeadForEdit(leadId) {
  try {
    const lead = await apiService.getLead(leadId);
    
    // Fill form fields
    document.getElementById('firstName').value = lead.first_name || '';
    document.getElementById('lastName').value = lead.last_name || '';
    document.getElementById('email').value = lead.email || '';
    document.getElementById('phone').value = lead.phone || '';
    document.getElementById('company').value = lead.company || '';
    document.getElementById('jobTitle').value = lead.job_title || '';
    document.getElementById('website').value = lead.website || '';
    document.getElementById('addressLine1').value = lead.address_line1 || '';
    document.getElementById('addressLine2').value = lead.address_line2 || '';
    document.getElementById('city').value = lead.city || '';
    document.getElementById('state').value = lead.state || '';
    document.getElementById('postalCode').value = lead.postal_code || '';
    document.getElementById('country').value = lead.country || '';
    document.getElementById('status').value = lead.status || 'new';
    document.getElementById('source').value = lead.source || '';
    document.getElementById('notes').value = lead.notes || '';
    document.getElementById('value').value = lead.value || '';
    document.getElementById('probability').value = lead.probability || '';
    document.getElementById('expectedCloseDate').value = lead.expected_close_date || '';
    
    // Update form title
    const formTitle = document.querySelector('.card-title');
    if (formTitle) {
      formTitle.textContent = 'Edit Lead';
    }
    
    // Update button text
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Update Lead';
    }
  } catch (error) {
    console.error('Error loading lead for edit:', error);
    showError('Failed to load lead data: ' + (error.message || 'Unknown error'));
  }
}

// Load lead details for view page
async function loadLeadDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');
  
  if (!leadId) {
    showError('Lead ID not provided');
    return;
  }
  
  try {
    const lead = await apiService.getLead(leadId);
    renderLeadDetails(lead);
  } catch (error) {
    console.error('Error loading lead details:', error);
    showError('Failed to load lead details: ' + (error.message || 'Unknown error'));
  }
}

// Render lead details
function renderLeadDetails(lead) {
  const detailsContainer = document.getElementById('leadDetails');
  if (!detailsContainer) return;
  
  detailsContainer.innerHTML = `
    <div class="row mb-4">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Personal Information</h5>
          </div>
          <div class="card-body">
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Name:</strong></div>
              <div class="col-sm-8">${escapeHtml(lead.first_name || '')} ${escapeHtml(lead.last_name || '')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Email:</strong></div>
              <div class="col-sm-8">${escapeHtml(lead.email || '')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Phone:</strong></div>
              <div class="col-sm-8">${escapeHtml(lead.phone || '')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Job Title:</strong></div>
              <div class="col-sm-8">${escapeHtml(lead.job_title || '')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Company:</strong></div>
              <div class="col-sm-8">${escapeHtml(lead.company || '')}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Lead Information</h5>
          </div>
          <div class="card-body">
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Address:</strong></div>
              <div class="col-sm-8">
                ${escapeHtml(lead.address_line1 || '')}<br>
                ${escapeHtml(lead.address_line2 ? lead.address_line2 + '<br>' : '')}
                ${escapeHtml(lead.city || '')}, ${escapeHtml(lead.state || '')} ${escapeHtml(lead.postal_code || '')}<br>
                ${escapeHtml(lead.country || '')}
              </div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Website:</strong></div>
              <div class="col-sm-8">${escapeHtml(lead.website || '')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Status:</strong></div>
              <div class="col-sm-8"><span class="badge ${getStatusBadgeClass(lead.status)}">${escapeHtml(lead.status || 'N/A')}</span></div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Source:</strong></div>
              <div class="col-sm-8">${escapeHtml(lead.source || 'N/A')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Value:</strong></div>
              <div class="col-sm-8">$${lead.value ? parseFloat(lead.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Probability:</strong></div>
              <div class="col-sm-8">${lead.probability || 0}%</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Expected Close:</strong></div>
              <div class="col-sm-8">${lead.expected_close_date || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Notes</h5>
          </div>
          <div class="card-body">
            <p>${escapeHtml(lead.notes || 'No notes available')}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-3">
      <a href="/lead/leads-create.html?id=${lead.id}" class="btn btn-primary me-2">Edit Lead</a>
      <button class="btn btn-danger" onclick="deleteLead('${lead.id}', '${escapeHtml(lead.first_name || '')} ${escapeHtml(lead.last_name || '')}')">Delete Lead</button>
      <a href="/lead/leads.html" class="btn btn-secondary ms-2">Back to List</a>
    </div>
  `;
}

// Delete lead function
async function deleteLead(leadId, leadName) {
  if (!confirm(`Are you sure you want to delete lead "${leadName}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    await apiService.deleteLead(leadId);
    showSuccess('Lead deleted successfully!');
    
    // If on the details page, redirect to list
    if (window.location.pathname.includes('/lead/leads-view.html')) {
      setTimeout(() => {
        window.location.href = '/lead/leads.html';
      }, 1000);
    } else {
      // On list page, reload the list
      loadLeads();
    }
  } catch (error) {
    console.error('Error deleting lead:', error);
    showError('Failed to delete lead: ' + (error.message || 'Unknown error'));
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