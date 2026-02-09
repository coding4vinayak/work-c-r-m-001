// API Service for ABETWORKS WORKCRM
// Centralized service to handle all API communications

class ApiService {
  constructor() {
    this.baseURL = window.location.origin; // Use current domain
    this.token = localStorage.getItem('accessToken') || null;
    
    // Set up axios defaults
    this.setupAxios();
  }

  setupAxios() {
    // Check if axios is available
    if (typeof axios !== 'undefined') {
      // Set default headers
      axios.defaults.baseURL = this.baseURL;
      axios.defaults.headers.common['Content-Type'] = 'application/json';
      
      // Add request interceptor to include token
      axios.interceptors.request.use(
        (config) => {
          const token = localStorage.getItem('accessToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        (error) => {
          return Promise.reject(error);
        }
      );

      // Add response interceptor to handle token refresh
      axios.interceptors.response.use(
        (response) => {
          return response;
        },
        async (error) => {
          const originalRequest = error.config;
          
          if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
              const refreshToken = localStorage.getItem('refreshToken');
              if (refreshToken) {
                const response = await this.refreshToken(refreshToken);
                localStorage.setItem('accessToken', response.accessToken);
                localStorage.setItem('refreshToken', response.refreshToken);
                
                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
                return axios(originalRequest);
              }
            } catch (refreshError) {
              // Token refresh failed, redirect to login
              this.logout();
              window.location.href = '/authentication/auth-login-cover.html';
            }
          }
          
          return Promise.reject(error);
        }
      );
    }
  }

  // Authentication methods
  async login(email, password) {
    try {
      const response = await axios.post('/api/auth/login', {
        email,
        password
      });
      
      // Store tokens
      this.token = response.data.accessToken;
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async register(userData) {
    try {
      const response = await axios.post('/api/auth/register', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async refreshToken(refreshToken) {
    try {
      const response = await axios.post('/api/auth/refresh-token', {
        refreshToken
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    this.token = null;
  }

  // Customer methods
  async getCustomers(params = {}) {
    try {
      const response = await axios.get('/api/customers', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getCustomer(id) {
    try {
      const response = await axios.get(`/api/customers/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createCustomer(customerData) {
    try {
      const response = await axios.post('/api/customers', customerData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateCustomer(id, customerData) {
    try {
      const response = await axios.put(`/api/customers/${id}`, customerData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteCustomer(id) {
    try {
      const response = await axios.delete(`/api/customers/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Lead methods
  async getLeads(params = {}) {
    try {
      const response = await axios.get('/api/leads', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getLead(id) {
    try {
      const response = await axios.get(`/api/leads/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createLead(leadData) {
    try {
      const response = await axios.post('/api/leads', leadData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateLead(id, leadData) {
    try {
      const response = await axios.put(`/api/leads/${id}`, leadData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteLead(id) {
    try {
      const response = await axios.delete(`/api/leads/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Deal methods
  async getDeals(params = {}) {
    try {
      const response = await axios.get('/api/deals', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getDeal(id) {
    try {
      const response = await axios.get(`/api/deals/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createDeal(dealData) {
    try {
      const response = await axios.post('/api/deals', dealData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateDeal(id, dealData) {
    try {
      const response = await axios.put(`/api/deals/${id}`, dealData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteDeal(id) {
    try {
      const response = await axios.delete(`/api/deals/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Task methods
  async getTasks(params = {}) {
    try {
      const response = await axios.get('/api/tasks', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getTask(id) {
    try {
      const response = await axios.get(`/api/tasks/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createTask(taskData) {
    try {
      const response = await axios.post('/api/tasks', taskData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateTask(id, taskData) {
    try {
      const response = await axios.put(`/api/tasks/${id}`, taskData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteTask(id) {
    try {
      const response = await axios.delete(`/api/tasks/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Quote methods
  async getQuotes(params = {}) {
    try {
      const response = await axios.get('/api/quotes', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getQuote(id) {
    try {
      const response = await axios.get(`/api/quotes/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createQuote(quoteData) {
    try {
      const response = await axios.post('/api/quotes', quoteData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateQuote(id, quoteData) {
    try {
      const response = await axios.put(`/api/quotes/${id}`, quoteData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteQuote(id) {
    try {
      const response = await axios.delete(`/api/quotes/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Invoice methods
  async getInvoices(params = {}) {
    try {
      const response = await axios.get('/api/invoices', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getInvoice(id) {
    try {
      const response = await axios.get(`/api/invoices/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async createInvoice(invoiceData) {
    try {
      const response = await axios.post('/api/invoices', invoiceData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateInvoice(id, invoiceData) {
    try {
      const response = await axios.put(`/api/invoices/${id}`, invoiceData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteInvoice(id) {
    try {
      const response = await axios.delete(`/api/invoices/${id}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // User profile methods
  async getProfile() {
    try {
      const response = await axios.get('/api/auth/profile');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await axios.put('/api/auth/profile', profileData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Utility method to handle errors
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      return {
        success: false,
        message: error.response.data.error || 'An error occurred',
        status: error.response.status
      };
    } else if (error.request) {
      // Request was made but no response received
      return {
        success: false,
        message: 'Network error. Please check your connection.',
        status: 0
      };
    } else {
      // Something else happened
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
        status: 0
      };
    }
  }
}

// Create global instance
const apiService = new ApiService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ApiService;
}