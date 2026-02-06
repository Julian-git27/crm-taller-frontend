// lib/api.ts - CAMBIA ESTO
import axios from 'axios';

const api = axios.create({
  // Quita /api porque tu backend no lo usa
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', // ← SIN /api
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;