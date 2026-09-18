/**
 * Resolves the backend API base URL dynamically.
 * In development / localhost, it uses NEXT_PUBLIC_API_URL or falls back to http://localhost:4000.
 * In production (PWA, Netlify, mobile, custom domain), it always points to the live backend on Render.
 */
export const RENDER_BACKEND_URL = 'https://notify-me-12z4.onrender.com';

export const getApiBase = () => {
  // If explicitly configured with a non-localhost URL (e.g. via environment variable in deployment)
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost') && !process.env.NEXT_PUBLIC_API_URL.includes('127.0.0.1')) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  // If in browser and not on localhost, use the production Render backend
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return RENDER_BACKEND_URL;
    }
  }

  // Default fallback for development
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
};

/**
 * Check if the given user or email has administrator privileges.
 */
export const isAdminUser = (userRole, userEmail) => {
  if (userRole === 'admin') return true;
  if (userEmail && typeof userEmail === 'string') {
    const clean = userEmail.trim().toLowerCase();
    if (clean === 'williamsaonen@gmail.com') return true;
  }
  return false;
};

export default getApiBase;
