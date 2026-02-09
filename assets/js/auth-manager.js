// Authentication and User State Management for ABETWORKS WORKCRM

class AuthManager {
  constructor() {
    this.apiService = apiService; // Assuming apiService is globally available
    this.currentUser = null;
    this.isAuthenticated = false;
    
    // Check if user is already logged in
    this.checkAuthStatus();
  }

  // Check if user is authenticated
  async checkAuthStatus() {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        this.currentUser = await this.apiService.getProfile();
        this.isAuthenticated = true;
      } catch (error) {
        // Token might be expired, clear it
        this.logout();
      }
    }
  }

  // Login user
  async login(email, password) {
    try {
      const result = await this.apiService.login(email, password);
      this.currentUser = result.user;
      this.isAuthenticated = true;
      
      // Redirect to dashboard after successful login
      window.location.href = '/dashboard/index.html';
      
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Register user
  async register(userData) {
    try {
      const result = await this.apiService.register(userData);
      this.currentUser = result.user;
      this.isAuthenticated = true;
      
      // Redirect to dashboard after successful registration
      window.location.href = '/dashboard/index.html';
      
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Logout user
  logout() {
    this.apiService.logout();
    this.currentUser = null;
    this.isAuthenticated = false;
    
    // Redirect to login page
    window.location.href = '/authentication/auth-login-cover.html';
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is authenticated
  getAuthStatus() {
    return this.isAuthenticated;
  }

  // Update user profile
  async updateProfile(profileData) {
    try {
      const result = await this.apiService.updateProfile(profileData);
      this.currentUser = result;
      
      return { success: true, user: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

// Create global instance
const authManager = new AuthManager();

// Initialize authentication on page load for protected pages
function initializeAuth() {
  // Check if this is a protected page
  const protectedPages = [
    '/dashboard/',
    '/customer/',
    '/lead/',
    '/deal/',
    '/task/',
    '/quote/',
    '/invoicing/',
    '/setting/'
  ];
  
  const currentPath = window.location.pathname;
  const isProtectedPage = protectedPages.some(page => currentPath.startsWith(page));
  
  if (isProtectedPage && !authManager.getAuthStatus()) {
    // Redirect to login if not authenticated
    window.location.href = '/authentication/auth-login-cover.html';
  }
}

// Run auth initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initializeAuth();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AuthManager, authManager };
}