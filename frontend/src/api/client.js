import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Request Interceptor: Attach Bearer token from localStorage for robust cross-domain authentication
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('meflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let unauthorizedDispatched = false;

// Response Interceptor: Handle data unwrapping and centralized error propagation
apiClient.interceptors.response.use(
  (response) => {
    unauthorizedDispatched = false; // Reset on successful communication
    return response.data;
  },
  (error) => {
    const customError = {
      message: error.response?.data?.message || error.message || 'Something went wrong',
      code: error.response?.data?.code || 'UNKNOWN_ERROR',
      statusCode: error.response?.status || 500,
      details: error.response?.data?.details || null,
    };

    // If 401 Unauthorized and not already on auth/login paths, broadcast session expiration
    if (
      customError.statusCode === 401 &&
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.startsWith('/set-password')
    ) {
      localStorage.removeItem('meflow_token');
      if (!unauthorizedDispatched) {
        unauthorizedDispatched = true;
        window.dispatchEvent(new CustomEvent('meflow:unauthorized'));
        setTimeout(() => {
          unauthorizedDispatched = false;
        }, 1500);
      }
    }

    return Promise.reject(customError);
  }
);

export default apiClient;
