import axios from 'axios';

let apiHost = import.meta.env.VITE_API_URL || '';

// Prepend https:// if protocol is missing (e.g. if set to raw host crm-backend.onrender.com)
if (apiHost && !apiHost.startsWith('http://') && !apiHost.startsWith('https://')) {
  apiHost = `https://${apiHost}`;
}

// Remove trailing slash if present
if (apiHost.endsWith('/')) {
  apiHost = apiHost.slice(0, -1);
}

const api = axios.create({
  baseURL: apiHost || (import.meta.env.DEV ? 'http://localhost:3000' : '')
});

// Automatically inject Authorization header if token exists in localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
