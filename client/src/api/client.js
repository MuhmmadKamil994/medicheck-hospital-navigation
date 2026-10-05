import axios from 'axios';

// Single axios instance for the whole app.
// Base URL comes from env so dev/prod need no code change.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 30000, // Gemini triage can take a few seconds
  headers: { 'Content-Type': 'application/json' },
});

// Attach the JWT (if any) to every request as a Bearer token.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medicheck_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Normalise a backend error into { message, errors }.
 * Backend shape is uniform: { success:false, message, errors? }.
 * Network/timeout failures get a friendly fallback message.
 */
export function parseApiError(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data) {
    const { message, errors } = err.response.data;
    return { message: message || fallback, errors: errors || null, status: err.response.status };
  }
  if (err?.code === 'ECONNABORTED') {
    return { message: 'The request took too long. Please try again.', errors: null, status: 0 };
  }
  return {
    message: 'Cannot reach the server. Check your connection and try again.',
    errors: null,
    status: 0,
  };
}

export default api;
