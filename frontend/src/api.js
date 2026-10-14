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
  baseURL: apiHost || (import.meta.env.DEV ? 'http://localhost:3000' : ''),
  timeout: 30000 // 30s timeout to allow Render / Neon cold-starts to wake up cleanly
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

// Response interceptor with auto-retry for Render/Neon cold-start blips & clean logout on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Auto-retry up to 2 times for cold starts / network timeouts (502, 503, 504, ECONNABORTED, Network Error)
    if (config && (config._retryCount === undefined || config._retryCount === null)) {
      config._retryCount = 0;
    }

    const isNetworkOrColdStart =
      !error.response ||
      [502, 503, 504, 524].includes(error.response?.status) ||
      error.code === 'ECONNABORTED';

    const isAuthLogin = config?.url?.includes('/api/auth/login');

    if (config && isNetworkOrColdStart && !isAuthLogin && config._retryCount < 2) {
      config._retryCount += 1;
      const delay = config._retryCount * 1200;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    // Handle token invalidation / expiration
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (!isAuthLogin) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:unauthorized'));
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
