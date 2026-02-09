// Login Page JavaScript for ABETWORKS WORKCRM

document.addEventListener('DOMContentLoaded', function() {
  // Get the login form
  const loginForm = document.getElementById('loginForm');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      // Get form values
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      
      // Basic validation
      if (!email || !password) {
        showError('Please enter both email and password');
        return;
      }
      
      // Show loading state
      const submitButton = loginForm.querySelector('button[type="submit"]');
      const originalText = submitButton.innerHTML;
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Signing In...';
      submitButton.disabled = true;
      
      try {
        // Attempt login
        const result = await authManager.login(email, password);
        
        if (result.success) {
          // Success - redirect to dashboard after login
          window.location.href = '/dashboard/index.html';
        } else {
          // Show error
          showError(result.message || 'Login failed. Please try again.');
        }
      } catch (error) {
        showError('An unexpected error occurred. Please try again.');
        console.error('Login error:', error);
      } finally {
        // Restore button state
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
      }
    });
  }
  
  // Function to show error messages
  function showError(message) {
    // Remove any existing error alerts
    const existingAlert = document.querySelector('.alert-danger');
    if (existingAlert) {
      existingAlert.remove();
    }
    
    // Create new alert
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show';
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `
      <strong>Error!</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Insert after the form header or at the top of the form
    const formContainer = loginForm.querySelector('.card-body') || loginForm;
    formContainer.insertBefore(alertDiv, formContainer.firstChild);
  }
  
  // Add event listener for "Remember Me" checkbox if it exists
  const rememberMeCheckbox = document.getElementById('remember-me');
  if (rememberMeCheckbox) {
    rememberMeCheckbox.addEventListener('change', function() {
      // Store preference in localStorage
      localStorage.setItem('rememberMe', this.checked);
    });
  }
  
  // Check if remember me was previously selected
  const rememberMePref = localStorage.getItem('rememberMe');
  if (rememberMePref === 'true') {
    document.getElementById('remember-me').checked = true;
  }
});

// Also handle the login form if it's using AJAX without a full page reload
function handleLoginFormSubmit(formElement) {
  formElement.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(formElement);
    const email = formData.get('email');
    const password = formData.get('password');
    
    // Basic validation
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }
    
    // Show loading state
    const submitButton = formElement.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Signing In...';
    submitButton.disabled = true;
    
    try {
      const result = await authManager.login(email, password);
      
      if (result.success) {
        console.log('Login successful');
      } else {
        showError(result.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      showError('An unexpected error occurred. Please try again.');
      console.error('Login error:', error);
    } finally {
      submitButton.innerHTML = originalText;
      submitButton.disabled = false;
    }
  });
}