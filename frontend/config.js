const isDevelopment = process.env.NODE_ENV === 'development';

export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:4000/api' 
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const API_ENDPOINTS = {
  WEBSITE_LINKS: '/feeds/website-links',
  // Add other endpoints as needed
};
