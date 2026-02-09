// Quotes Page JavaScript for ABETWORKS WORKCRM

document.addEventListener('DOMContentLoaded', function() {
  // Initialize quotes page if on the right page
  if (window.location.pathname.includes('/quote/')) {
    loadQuotes();
  }
  
  // Handle quote creation form if on create page
  if (window.location.pathname.includes('/quote/proposal-create.html')) {
    setupQuoteCreationForm();
  }
  
  // Handle quote view page
  if (window.location.pathname.includes('/quote/proposal-view.html')) {
    loadQuoteDetails();
  }
});

// Load quotes list
async function loadQuotes() {
  try {
    // Show loading state
    const quotesContainer = document.getElementById('quotesList');
    if (quotesContainer) {
      quotesContainer.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }
    
    // Fetch quotes from API
    const response = await apiService.getQuotes({
      page: 1,
      limit: 50
    });
    
    if (response.data && Array.isArray(response.data)) {
      renderQuotesList(response.data);
    } else {
      console.error('Invalid response format:', response);
      showError('Failed to load quotes data');
    }
  } catch (error) {
    console.error('Error loading quotes:', error);
    showError('Failed to load quotes: ' + (error.message || 'Unknown error'));
  }
}

// Render quotes list
function renderQuotesList(quotes) {
  const quotesContainer = document.getElementById('quotesList');
  if (!quotesContainer) return;
  
  if (quotes.length === 0) {
    quotesContainer.innerHTML = '<div class="alert alert-info">No quotes found. <a href="/quote/proposal-create.html">Create your first quote</a>.</div>';
    return;
  }
  
  // Clear container
  quotesContainer.innerHTML = '';
  
  // Create table
  const table = document.createElement('table');
  table.className = 'table table-striped table-hover';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Quote #</th>
        <th>Customer</th>
        <th>Total Amount</th>
        <th>Status</th>
        <th>Issue Date</th>
        <th>Expiry Date</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="quotesTableBody">
    </tbody>
  `;
  
  quotesContainer.appendChild(table);
  
  // Populate table rows
  const tbody = document.getElementById('quotesTableBody');
  quotes.forEach(quote => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(quote.quote_number || 'N/A')}</td>
      <td>${quote.customer_id ? 'Customer Assigned' : 'No Customer'}</td>
      <td>$${quote.total_amount ? parseFloat(quote.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
      <td>
        <span class="badge ${getStatusBadgeClass(quote.status)}">${escapeHtml(quote.status || 'N/A')}</span>
      </td>
      <td>${formatDate(quote.issue_date)}</td>
      <td>${formatDate(quote.expiry_date)}</td>
      <td>
        <div class="dropdown">
          <a href="#" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-boundary="viewport" data-bs-toggle="dropdown" aria-expanded="false">
            Actions
          </a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="/quote/proposal-view.html?id=${quote.id}"><i class="feather-eye me-2"></i>View</a></li>
            <li><a class="dropdown-item" href="/quote/proposal-create.html?id=${quote.id}"><i class="feather-edit me-2"></i>Edit</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" onclick="deleteQuote('${quote.id}', '${quote.quote_number || quote.id}')"><i class="feather-trash-2 me-2"></i>Delete</a></li>
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

// Helper function to get status badge class
function getStatusBadgeClass(status) {
  switch (status?.toLowerCase()) {
    case 'draft':
      return 'bg-secondary';
    case 'sent':
      return 'bg-info';
    case 'accepted':
      return 'bg-success';
    case 'rejected':
      return 'bg-danger';
    case 'expired':
      return 'bg-warning';
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

// Setup quote creation form
function setupQuoteCreationForm() {
  const form = document.getElementById('quoteForm');
  if (!form) return;
  
  // Check if we're editing an existing quote
  const urlParams = new URLSearchParams(window.location.search);
  const quoteId = urlParams.get('id');
  
  if (quoteId) {
    // Load quote data for editing
    loadQuoteForEdit(quoteId);
  }
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
      customer_id: document.getElementById('customer').value,
      quote_number: document.getElementById('quoteNumber').value.trim(),
      issue_date: document.getElementById('issueDate').value,
      expiry_date: document.getElementById('expiryDate').value,
      subtotal: parseFloat(document.getElementById('subtotal').value) || 0,
      tax_amount: parseFloat(document.getElementById('taxAmount').value) || 0,
      total_amount: parseFloat(document.getElementById('totalAmount').value) || 0,
      status: document.getElementById('status').value,
      notes: document.getElementById('notes').value.trim(),
      terms_conditions: document.getElementById('termsConditions').value.trim()
    };
    
    // Validation
    if (!formData.customer_id) {
      showError('Customer is required');
      return;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Saving...';
    submitButton.disabled = true;
    
    try {
      let result;
      if (quoteId) {
        // Update existing quote
        result = await apiService.updateQuote(quoteId, formData);
        showSuccess('Quote updated successfully!');
      } else {
        // Create new quote
        result = await apiService.createQuote(formData);
        showSuccess('Quote created successfully!');
      }
      
      // Redirect to quotes list after a delay
      setTimeout(() => {
        window.location.href = '/quote/proposal.html';
      }, 1500);
      
    } catch (error) {
      console.error('Error saving quote:', error);
      showError('Failed to save quote: ' + (error.message || 'Unknown error'));
    } finally {
      submitButton.innerHTML = originalText;
      submitButton.disabled = false;
    }
  });
}

// Load quote data for editing
async function loadQuoteForEdit(quoteId) {
  try {
    const quote = await apiService.getQuote(quoteId);
    
    // Fill form fields
    document.getElementById('customer').value = quote.customer_id || '';
    document.getElementById('quoteNumber').value = quote.quote_number || '';
    document.getElementById('issueDate').value = quote.issue_date || '';
    document.getElementById('expiryDate').value = quote.expiry_date || '';
    document.getElementById('subtotal').value = quote.subtotal || '';
    document.getElementById('taxAmount').value = quote.tax_amount || '';
    document.getElementById('totalAmount').value = quote.total_amount || '';
    document.getElementById('status').value = quote.status || 'draft';
    document.getElementById('notes').value = quote.notes || '';
    document.getElementById('termsConditions').value = quote.terms_conditions || '';
    
    // Update form title
    const formTitle = document.querySelector('.card-title');
    if (formTitle) {
      formTitle.textContent = 'Edit Quote';
    }
    
    // Update button text
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Update Quote';
    }
  } catch (error) {
    console.error('Error loading quote for edit:', error);
    showError('Failed to load quote data: ' + (error.message || 'Unknown error'));
  }
}

// Load quote details for view page
async function loadQuoteDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const quoteId = urlParams.get('id');
  
  if (!quoteId) {
    showError('Quote ID not provided');
    return;
  }
  
  try {
    const quote = await apiService.getQuote(quoteId);
    renderQuoteDetails(quote);
  } catch (error) {
    console.error('Error loading quote details:', error);
    showError('Failed to load quote details: ' + (error.message || 'Unknown error'));
  }
}

// Render quote details
function renderQuoteDetails(quote) {
  const detailsContainer = document.getElementById('quoteDetails');
  if (!detailsContainer) return;
  
  detailsContainer.innerHTML = `
    <div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Quote Details</h5>
            <div>
              <span class="badge ${getStatusBadgeClass(quote.status)}">${escapeHtml(quote.status || 'N/A')}</span>
            </div>
          </div>
          <div class="card-body">
            <div class="row mb-3">
              <div class="col-sm-3"><strong>Quote Number:</strong></div>
              <div class="col-sm-9">${escapeHtml(quote.quote_number || 'N/A')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-3"><strong>Issue Date:</strong></div>
              <div class="col-sm-9">${formatDate(quote.issue_date)}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-3"><strong>Expiry Date:</strong></div>
              <div class="col-sm-9">${formatDate(quote.expiry_date)}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-3"><strong>Customer:</strong></div>
              <div class="col-sm-9">${quote.customer_id ? 'Customer Assigned' : 'No Customer'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="row mb-4">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Financial Summary</h5>
          </div>
          <div class="card-body">
            <div class="row mb-2">
              <div class="col-sm-6"><strong>Subtotal:</strong></div>
              <div class="col-sm-6 text-end">$${quote.subtotal ? parseFloat(quote.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
            </div>
            <div class="row mb-2">
              <div class="col-sm-6"><strong>Tax Amount:</strong></div>
              <div class="col-sm-6 text-end">$${quote.tax_amount ? parseFloat(quote.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
            </div>
            <div class="row mb-2">
              <div class="col-sm-6"><strong>Total Amount:</strong></div>
              <div class="col-sm-6 text-end">$${quote.total_amount ? parseFloat(quote.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Additional Info</h5>
          </div>
          <div class="card-body">
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Issued By:</strong></div>
              <div class="col-sm-8">${quote.issued_by ? 'User Assigned' : 'Not Assigned'}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Created:</strong></div>
              <div class="col-sm-8">${formatDate(quote.created_at)}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Updated:</strong></div>
              <div class="col-sm-8">${formatDate(quote.updated_at)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Notes</h5>
          </div>
          <div class="card-body">
            <p>${escapeHtml(quote.notes || 'No notes available')}</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="card-title mb-0">Terms & Conditions</h5>
          </div>
          <div class="card-body">
            <p>${escapeHtml(quote.terms_conditions || 'No terms and conditions specified')}</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="mt-3">
      <a href="/quote/proposal-create.html?id=${quote.id}" class="btn btn-primary me-2">Edit Quote</a>
      <button class="btn btn-danger" onclick="deleteQuote('${quote.id}', '${quote.quote_number || quote.id}')">Delete Quote</button>
      <a href="/quote/proposal.html" class="btn btn-secondary ms-2">Back to List</a>
    </div>
  `;
}

// Delete quote function
async function deleteQuote(quoteId, quoteNumber) {
  if (!confirm(`Are you sure you want to delete quote "${quoteNumber}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    await apiService.deleteQuote(quoteId);
    showSuccess('Quote deleted successfully!');
    
    // If on the details page, redirect to list
    if (window.location.pathname.includes('/quote/proposal-view.html')) {
      setTimeout(() => {
        window.location.href = '/quote/proposal.html';
      }, 1000);
    } else {
      // On list page, reload the list
      loadQuotes();
    }
  } catch (error) {
    console.error('Error deleting quote:', error);
    showError('Failed to delete quote: ' + (error.message || 'Unknown error'));
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