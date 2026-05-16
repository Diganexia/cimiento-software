import axios from 'axios';

function resolveBaseURL() {
  // In Electron, get URL from main process (synchronous IPC)
  if (typeof window !== 'undefined' && window.electronAPI) {
    const url = window.electronAPI.getServerUrl();
    if (url) return url.replace(/\/$/, '') + '/api';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
}

const api = axios.create({
  baseURL: resolveBaseURL()
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ferreteria_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('ferreteria_token');
      // Use hash navigation so it works correctly under file:// protocol
      window.location.hash = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
