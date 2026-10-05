import axios from 'axios';
import { parseApiError } from './client.js';

// Separate axios instance for the admin console.
// The admin JWT lives apart from the user JWT (SDD 1.5: no self-registration,
// manually created superadmin accounts) under its own localStorage key.
const adminApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('medicheck_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { parseApiError };
export default adminApi;
