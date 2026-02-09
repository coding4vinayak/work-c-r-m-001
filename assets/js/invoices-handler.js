// Invoices Page JavaScript for ABETWORKS WORKCRM

document.addEventListener('DOMContentLoaded', function() {
  // Initialize invoices page if on the right page
  if (window.location.pathname.includes('/invoicing/')) {
    loadInvoices();
  }
  
  // Handle invoice creation form if on create page
  if (window.location.pathname.includes('/invoicing/invoice-create.html')) {
    setupInvoiceCreationForm();
  }
  
  // Handle invoice view page
  if (window.location.pathname.includes('/invoicing/invoice-view.html')) {
    loadInvoiceDetails();
  }
});

// Load invoices list
async function loadInvoices() {
  try {
    // Show loading state
    const invoicesContainer = document.getElementById('invoicesList');
    if (invoicesContainer) {
      invoicesContainer.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    }
    
    // Fetch invoices from API
    const response = await apiService.getInvoices({
      page: 1,
      limit: 50
    });
    
    if (response.data && Array.isArray(response.data)) {
      renderInvoicesList(response.data);
    } else {
      console.error('Invalid response format:', response);
      showError('Failed to load invoices data');
    }
  } catch (error) {
    console.error('Error loading invoices:', error);
    showError('Failed to load invoices: ' + (error.message || 'Unknown error'));
  }
}

// Render invoices list
function renderInvoicesList(invoices) {
  const invoicesContainer = document.getElementById('invoicesList');
  if (!invoicesContainer) return;
  
  if (invoices.length === 0) {
    invoicesContainer.innerHTML = '<div class="alert alert-info">No invoices found. <a href="/invoicing/invoice-create.html">Create your first invoice</a>.</div>';
    return;
  }
  
  // Clear container
  invoicesContainer.innerHTML = '';
  
  // Create table
  const table = document.createElement('table');
  table.className = 'table table-striped table-hover';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Invoice #</th>
        <th>Customer</th>
        <th>Total Amount</th>
        <th>Amount Due</th>
        <th>Status</th>
        <th>Issue Date</th>
        <th>Due Date</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="invoicesTableBody">
    </tbody>
  `;
  
  invoicesContainer.appendChild(table);
  
  // Populate table rows
  const tbody = document.getElementById('invoicesTableBody');
  invoices.forEach(invoice => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(invoice.invoice_number || 'N/A')}</td>
      <td>${invoice.customer_id ? 'Customer Assigned' : 'No Customer'}</td>
      <td>$${invoice.total_amount ? parseFloat(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
      <td>$${invoice.amount_due ? parseFloat(invoice.amount_due).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</td>
      <td>
        <span class="badge ${getStatusBadgeClass(invoice.status)}">${escapeHtml(invoice.status || 'N/A')}</span>
      </td>
      <td>${formatDate(invoice.issue_date)}</td>
      <td>${formatDate(invoice.due_date)}</td>
      <td>
        <div class="dropdown">
          <a href="#" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-boundary="viewport" data-bs-toggle="dropdown" aria-expanded="false">
            Actions
          </a>
          <ul class="dropdown-menu">
            <li><a class="dropdown-item" href="/invoicing/invoice-view.html?id=${invoice.id}"><i class="feather-eye me-2"></i>View</a></li>
            <li><a class="dropdown-item" href="/invoicing/invoice-create.html?id=${invoice.id}"><i class="feather-edit me-2"></i>Edit</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="#" onclick="deleteInvoice('${invoice.id}', '${invoice.invoice_number || invoice.id}')"><i class="feather-trash-2 me-2"></i>Delete</a></li>
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
    case 'paid':
      return 'bg-success';
    case 'partial':
      return 'bg-warning';
    case 'overdue':
      return 'bg-danger';
    case 'void':
      return 'bg-dark';
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

// Setup invoice creation form
function setupInvoiceCreationForm() {
  const form = document.getElementById('invoiceForm');
  if (!form) return;
  
  // Check if we're editing an existing invoice
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceId = urlParams.get('id');
  
  if (invoiceId) {
    // Load invoice data for editing
    loadInvoiceForEdit(invoiceId);
  }
  
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Get form data
    const formData = {
      customer_id: document.getElementById('customer').value,
      invoice_number: document.getElementById('invoiceNumber').value.trim(),
      quote_id: document.getElementById('quote').value,
      issue_date: document.getElementById('issueDate').value,
      due_date: document.getElementById('dueDate').value,
      subtotal: parseFloat(document.getElementById('subtotal').value) || 0,
      tax_amount: parseFloat(document.getElementById('taxAmount').value) || 0,
      total_amount: parseFloat(document.getElementById('totalAmount').value) || 0,
      amount_paid: parseFloat(document.getElementById('amountPaid').value) || 0,
      amount_due: parseFloat(document.getElementById('amountDue').value) || 0,
      status: document.getElementById('status').value,
      notes: document.getElementById('notes').value.trim(),
      terms_conditions: document.getElementById('termsConditions').value.trim()
    };
    
    // Validation
    if (!formData.customer_id) {
      showError('Customer is required');
      return;
    }
    
    // Calculate amount due if not provided
    if (!formData.amount_due) {
      formData.amount_due = formData.total_amount - formData.amount_paid;
    }
    
    // Show loading state
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Saving...';
    submitButton.disabled = true;
    
    try {
      let result;
      if (invoiceId) {
        // Update existing invoice
        result = await apiService.updateInvoice(invoiceId, formData);
        showSuccess('Invoice updated successfully!');
      } else {
        // Create new invoice
        result = await apiService.createInvoice(formData);
        showSuccess('Invoice created successfully!');
      }
      
      // Redirect to invoices list after a delay
      setTimeout(() => {
        window.location.href = '/invoicing/invoice-view.html'; // or wherever the invoice list is
      }, 1500);
      
    } catch (error) {
      console.error('Error saving invoice:', error);
      showError('Failed to save invoice: ' + (error.message || 'Unknown error'));
    } finally {
      submitButton.innerHTML = originalText;
      submitButton.disabled = false;
    }
  });
}

// Load invoice data for editing
async function loadInvoiceForEdit(invoiceId) {
  try {
    const invoice = await apiService.getInvoice(invoiceId);
    
    // Fill form fields
    document.getElementById('customer').value = invoice.customer_id || '';
    document.getElementById('invoiceNumber').value = invoice.invoice_number || '';
    document.getElementById('quote').value = invoice.quote_id || '';
    document.getElementById('issueDate').value = invoice.issue_date || '';
    document.getElementById('dueDate').value = invoice.due_date || '';
    document.getElementById('subtotal').value = invoice.subtotal || '';
    document.getElementById('taxAmount').value = invoice.tax_amount || '';
    document.getElementById('totalAmount').value = invoice.total_amount || '';
    document.getElementById('amountPaid').value = invoice.amount_paid || '';
    document.getElementById('amountDue').value = invoice.amount_due || '';
    document.getElementById('status').value = invoice.status || 'draft';
    document.getElementById('notes').value = invoice.notes || '';
    document.getElementById('termsConditions').value = invoice.terms_conditions || '';
    
    // Update form title
    const formTitle = document.querySelector('.card-title');
    if (formTitle) {
      formTitle.textContent = 'Edit Invoice';
    }
    
    // Update button text
    const submitButton = document.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.textContent = 'Update Invoice';
    }
  } catch (error) {
    console.error('Error loading invoice for edit:', error);
    showError('Failed to load invoice data: ' + (error.message || 'Unknown error'));
  }
}

// Load invoice details for view page
async function loadInvoiceDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const invoiceId = urlParams.get('id');
  
  if (!invoiceId) {
    showError('Invoice ID not provided');
    return;
  }
  
  try {
    const invoice = await apiService.getInvoice(invoiceId);
    renderInvoiceDetails(invoice);
  } catch (error) {
    console.error('Error loading invoice details:', error);
    showError('Failed to load invoice details: ' + (error.message || 'Unknown error'));
  }
}

// Render invoice details
function renderInvoiceDetails(invoice) {
  const detailsContainer = document.getElementById('invoiceDetails');
  if (!detailsContainer) return;
  
  detailsContainer.innerHTML = `
    <div class="row mb-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="card-title mb-0">Invoice Details</h5>
            <div>
              <span class="badge ${getStatusBadgeClass(invoice.status)}">${escapeHtml(invoice.status || 'N/A')}</span>
            </div>
          </div>
          <div class="card-body">
            <div class="row mb-3">
              <div class="col-sm-3"><strong>Invoice Number:</strong></div>
              <div class="col-sm-9">${escapeHtml(invoice.invoice_number || 'N/A')}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-3"><strong>Issue Date:</strong></div>
              <div class="col-sm-9">${formatDate(invoice.issue_date)}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-3"><strong>Due Date:</strong></div>
              <div class="col-sm-9">${formatDate(invoice.due_date)}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-3"><strong>Customer:</strong></div>
              <div class="col-sm-9">${invoice.customer_id ? 'Customer Assigned' : 'No Customer'}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-3"><strong>Quote Reference:</strong></div>
              <div class="col-sm-9">${invoice.quote_id || 'None'}</div>
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
              <div class="col-sm-6 text-end">$${invoice.subtotal ? parseFloat(invoice.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
            </div>
            <div class="row mb-2">
              <div class="col-sm-6"><strong>Tax Amount:</strong></div>
              <div class="col-sm-6 text-end">$${invoice.tax_amount ? parseFloat(invoice.tax_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
            </div>
            <div class="row mb-2">
              <div class="col-sm-6"><strong>Total Amount:</strong></div>
              <div class="col-sm-6 text-end">$${invoice.total_amount ? parseFloat(invoice.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
            </div>
            <div class="row mb-2">
              <div class="col-sm-6"><strong>Amount Paid:</strong></div>
              <div class="col-sm-6 text-end">$${invoice.amount_paid ? parseFloat(invoice.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
            </div>
            <div class="row mb-2">
              <div class="col-sm-6"><strong>Amount Due:</strong></div>
              <div class="col-sm-6 text-end">$${invoice.amount_due ? parseFloat(invoice.amount_due).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</div>
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
              <div class="col-sm-8">${invoice.issued_by ? 'User Assigned' : 'Not Assigned'}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Created:</strong></div>
              <div class="col-sm-8">${formatDate(invoice.created_at)}</div>
            </div>
            <div class="row mb-3">
              <div class="col-sm-4"><strong>Updated:</strong></div>
              <div class="col-sm-8">${formatDate(invoice.updated_at)}</div>
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
            <p>${escapeHtml(invoice.notes || 'No notes available')}</p>
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
            <p>${escapeHtml(invoice.terms_conditions || 'No terms and conditions specified')}</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="mt-3">
      <a href="/invoicing/invoice-create.html?id=${invoice.id}" class="btn btn-primary me-2">Edit Invoice</a>
      <button class="btn btn-danger" onclick="deleteInvoice('${invoice.id}', '${invoice.invoice_number || invoice.id}')">Delete Invoice</button>
      <a href="/invoicing/invoice-view.html" class="btn btn-secondary ms-2">Back to List</a>
    </div>
  `;
}

// Delete invoice function
async function deleteInvoice(invoiceId, invoiceNumber) {
  if (!confirm(`Are you sure you want to delete invoice "${invoiceNumber}"? This action cannot be undone.`)) {
    return;
  }
  
  try {
    await apiService.deleteInvoice(invoiceId);
    showSuccess('Invoice deleted successfully!');
    
    // If on the details page, redirect to list
    if (window.location.pathname.includes('/invoicing/invoice-view.html')) {
      setTimeout(() => {
        window.location.href = '/invoicing/invoice-view.html'; // or wherever the invoice list is
      }, 1000);
    } else {
      // On list page, reload the list
      loadInvoices();
    }
  } catch (error) {
    console.error('Error deleting invoice:', error);
    showError('Failed to delete invoice: ' + (error.message || 'Unknown error'));
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