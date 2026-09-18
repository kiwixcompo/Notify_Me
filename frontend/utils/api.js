import axios from 'axios';
import { getApiBase } from './apiBase';

// Create axios instance without baseURL to prevent duplication
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add base URL and handle paths
api.interceptors.request.use((config) => {
  // If URL is already absolute, use it as is
  if (config.url.startsWith('http')) {
    return config;
  }
  
  // Otherwise, prepend the base URL dynamically
  const baseURL = getApiBase();
  config.url = `${baseURL}${config.url.startsWith('/') ? '' : '/'}${config.url}`;
  return config;
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
