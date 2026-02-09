// Customers Page JavaScript for ABETWORKS WORKCRM

document.addEventListener('DOMContentLoaded', function() {
  // Initialize customers page if on the right page
  if (window.location.pathname.includes('/customer/')) {
    loadCustomers();
  }
  
  // Handle customer creation form if on create page
  if (window.location.pathname.includes('/customer/customers-create.html')) {
    setupCustomerCreationForm();
  }
  
  // Handle customer view page
  if (window.location.pathname.includes('/customer/customers-view.html')) {
    loadCustomerDetails();
  }
});

// Load customers list
async function loadCustomers() {
  try {
    // Show loading state
    const customersContainer = document.getElementById('customersList');
    if (customersContainer) {
      customersContainer.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }
    
    // Fetch customers from API
    const response = await apiService.getCustomers({
      page: 1,
      limit: 50
    });
    
    if (response.data && Array.isArray(response.data)) {
      renderCustomersList(response.data);
    } else {
      console.error('Invalid response format:', response);
      showError('Failed to load customers data');
    }
  } catch (error) {
    console.error('Error loading customers:', error);
    showError('Failed to load customers: ' + (error.message || 'Unknown error'));
  }
}

// Render customers list
function renderCustomersList(customers) {
  const customersContainer = document.getElementById('customersList');
  if (!customersContainer) return;
  
  if (customers.length === 0) {
    customersContainer.innerHTML = '<div class="alert alert-info">No customers found. <a href="/customer/customers-create.html">Create your first customer</a>.</div>';
    return;
  }
  
  // Clear container
  customersContainer.innerHTML = '';
  
  // Create table
  const table = document.createElement('table');
  table.className = 'table table-striped table-hover';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Company</th>
        <th>Phone</th>
        <th>Status</th>
        <th>Created</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="customersTableBody">
    </tbody>
  `;
  
  customersContainer.appendChild(table);
  
  // Populate table rows
  const tbody = document.getElementById('customersTableBody');
  customers.forEach(customer => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <div class="flex-shrink-0">
            <div class="avatar-text bg-secondary">
              <span>${getInitials(customer.first_name, customer.last_name)}</span>
            </div>
          </div>
          <div class="flex-grow-1 ms-3">
            <h6 class="mb-0">${escapeHtml(customer.first_name || '')} ${escapeHtml(customer.last_name || '')}</h6>
            <small class="text-muted">${escapeHtml(customer.job_title || '')}</small>
          </div>
        </div>
      </td>
      <td>${escapeHtml(customer.email || '')}</td>
      <td>${escapeHtml(customer.company || '')}</td>
      <td>${escapeHtml(customer.phone || '')}</td>
      <td>
        <span class="badge ${getStatusBadgeClass(customer.status)}">${escapeHtml(customer.status || 'N/A')}</span>
      </td>
      <td>${formatDate(customer.created_at)}</td>
      <td>
        <div class="dropdown">
          <a href="#" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-boundary="viewport" data-bs-toggle="dropdown" aria-expanded="false">
            Actions
          </a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="/customer/customers-view.html?id=${customer.id}"><i class="feather-eye me-2"></i>View</a></li>
            <li><a class="dropdown-item" href="/customer/customers-create.html?id=${customer.id}"><i class="feather-edit me-2"></i>Edit</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" onclick="deleteCustomer('${customer.id}', '${escapeHtml(customer.first_name || '')} ${escapeHtml(customer.last_name || '')}')"><i class="feather-trash-2 me-2"></i>Delete</a></li>
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
    case 'lead':
      return 'bg-warning';
    case 'customer':
      return 'bg-success';
    case 'prospect':
      return 'bg-info';
    case 'inactive':
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

// Setup customer creation form
function setupCustomerCreationForm() {
  const form = document.getElementById('customerForm');
  if (!form) return;
  
  // Check if we're editing an existing customer
  const urlParams = new URLSearchParams(window.location.search);
  const customerId = urlParams.get('id');
  
  if (customerId) {
    // Load customer data for editing
    loadCustomerForEdit(customerId);
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
      lead_score: parseInt(document.getElementById('leadScore').value) || 0
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
      if (customerId) {
        // Update existing customer
        result = await apiService.updateCustomer(customerId, formData);
        showSuccess('Customer updated successfully!');
      } else {
        // Create new customer
        result = await apiService.createCustomer(formData);
        showSuccess('Customer created successfully!');
      }
      
      // Redirect to customers list after a delay
      setTimeout(() => {
        window.location.href = '/customer/customers.html';
      }, 1500);
      
    } catch (error) {
      console.error('Error saving customer:', error);
      showError('Failed to save customer: ' + (error.message || 'Unknown error'));
    } finally {
      submitButton.innerHTML = originalText;
      submitButton.disabled = false;
    }
  });
}

// Load customer data for editing
async function loadCustomerForEdit(customerId) {
  try {
    const customer = await apiService.getCustomer(customerId);
    
    // Fill form fields
    document.getElementById('firstName').value = customer.first_name || '';
    document.getElementById('lastName').value = customer.last_name || '';
    document.getElementById('email').value = customer.email || '';
    document.getElementById('phone').value = customer.phone || '';
    document.getElementById('company').value = customer.company || '';
    document.getElementById('jobTitle').value = customer.job_title || '';
    document.getElementById('website').value = customer.website || '';
    document.getElementById('addressLine1').value = customer.address_line1 || '';
    document.getElementById('addressLine2').value = customer.address_line2 || '';
    document.getElementById('city').value = customer.city || '';
    document.getElementById('state').value = customer.state || '';
    document.getElementById('postalCode').value = customer.postal_code || '';
    document.getElementById('country').value = customer.country || '';
    document.getElementById('status').value = customer.status || 'lead';
    document.getElementById('source').value = customer.source || '';
    document.getElementById('notes').value = customer.notes || '';
    document.getElementById('leadScore').value = customer.lead_score || 0;
    
    // Update form title
    const formTitle = document.querySelector('.card-title');
    if (formTitle) {
      formTitle.textContent = 'Edit Customer';
    }
    
    // Update button text
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Update Customer';
    }
  } catch (error) {
    console.error('Error loading customer for edit:', error);
    showError('Failed to load customer data: ' + (error.message || 'Unknown error'));
  }
}

// Load customer details for view page
async function loadCustomerDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const customerId = urlParams.get('id');
  
  if (!customerId) {
    showError('Customer ID not provided');
    return;
  }
  
  try {
    const customer = await apiService.getCustomer(customerId);
    renderCustomerDetails(customer);
  } catch (error) {
    console.error('Error loading customer details:', error);
    showError('Failed to load customer details: ' + (error.message || 'Unknown error'));
  }
}

// Render customer details
function renderCustomerDetails(customer) {
  const detailsContainer = document.getElementById('customerDetails');
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
              <div class="col-sm-8">${escapeHtml(customer.first_name || '')} ${escapeHtml(customer.last_name || '')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Email:</strong></div>
              <div class="col-sm-8">${escapeHtml(customer.email || '')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Phone:</strong></div>
              <div class="col-sm-8">${escapeHtml(customer.phone || '')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Job Title:</strong></div>
              <div class="col-sm-8">${escapeHtml(customer.job_title || '')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Company:</strong></div>
              <div class="col-sm-8">${escapeHtml(customer.company || '')}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Contact Information</h5>
          </div>
          <div class="card-body">
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Address:</strong></div>
              <div class="col-sm-8">
                ${escapeHtml(customer.address_line1 || '')}<br>
                ${escapeHtml(customer.address_line2 ? customer.address_line2 + '<br>' : '')}
                ${escapeHtml(customer.city || '')}, ${escapeHtml(customer.state || '')} ${escapeHtml(customer.postal_code || '')}<br>
                ${escapeHtml(customer.country || '')}
              </div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Website:</strong></div>
              <div class="col-sm-8">${escapeHtml(customer.website || '')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Status:</strong></div>
              <div class="col-sm-8"><span class="badge ${getStatusBadgeClass(customer.status)}">${escapeHtml(customer.status || 'N/A')}</span></div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Source:</strong></div>
              <div class="col-sm-8">${escapeHtml(customer.source || 'N/A')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Lead Score:</strong></div>
              <div class="col-sm-8">${customer.lead_score || 0}</div>
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
            <p>${escapeHtml(customer.notes || 'No notes available')}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="mt-3">
      <a href="/customer/customers-create.html?id=${customer.id}" class="btn btn-primary me-2">Edit Customer</a>
      <button class="btn btn-danger" onclick="deleteCustomer('${customer.id}', '${escapeHtml(customer.first_name || '')} ${escapeHtml(customer.last_name || '')}')">Delete Customer</button>
      <a href="/customer/customers.html" class="btn btn-secondary ms-2">Back to List</a>
    </div>
  `;
}

// Delete customer function
async function deleteCustomer(customerId, customerName) {
  if (!confirm(`Are you sure you want to delete customer "${customerName}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    await apiService.deleteCustomer(customerId);
    showSuccess('Customer deleted successfully!');
    
    // If on the details page, redirect to list
    if (window.location.pathname.includes('/customer/customers-view.html')) {
      setTimeout(() => {
        window.location.href = '/customer/customers.html';
      }, 1000);
    } else {
      // On list page, reload the list
      loadCustomers();
    }
  } catch (error) {
    console.error('Error deleting customer:', error);
    showError('Failed to delete customer: ' + (error.message || 'Unknown error'));
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