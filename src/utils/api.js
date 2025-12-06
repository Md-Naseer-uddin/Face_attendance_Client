import axios from 'axios';

/**
 * API Utility
 * Centralized API configuration and helper functions
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Get authentication token from localStorage
 */
const getAuthToken = () => {
  return localStorage.getItem('token');
};

/**
 * Get user data from localStorage
 */
export const getUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (err) {
    console.error('Error parsing user data:', err);
    return null;
  }
};

/**
 * Check if user is admin
 */
export const isAdmin = () => {
  const user = getUser();
  return user?.role?.toLowerCase() === 'admin';
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getAuthToken() && !!getUser();
};

/**
 * Logout user
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Create axios instance with default config
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add auth token
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect on 401 if it's NOT the login endpoint
    if (error.response?.status === 401 && !error.config.url.includes('/login')) {
      // Token expired or invalid - clear storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * API Methods
 */
export const api = {
  // Auth
  login: (email, password) => 
    apiClient.post('/api/login', { email, password }),
  
  verify: () => 
    apiClient.get('/api/verify'),

  // Registration
  register: (userId, name, embedding, email = null, password = null, role = 'user') =>
    apiClient.post('/api/register', { userId, name, embedding, email, password, role }),

  // Attendance
  markAttendance: (embedding, livenessScore) =>
    apiClient.post('/api/mark-attendance', { embedding, livenessScore }),

  getAttendance: () =>
    apiClient.get('/api/attendance'),

  exportAttendance: (startDate = null, endDate = null) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return apiClient.get('/api/export-attendance', { params });
  },

  // People
  getPeople: () =>
    apiClient.get('/api/people'),

  getPerson: (id) =>
    apiClient.get(`/api/people/${id}`),

  deletePerson: (id) =>
    apiClient.delete(`/api/people/${id}`),

  // Health check
  health: () =>
    apiClient.get('/api/health'),
};

export default api;
