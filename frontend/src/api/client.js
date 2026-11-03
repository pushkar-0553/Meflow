import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const customError = {
      message: error.response?.data?.message || error.message || 'Something went wrong',
      code: error.response?.data?.code || 'UNKNOWN_ERROR',
      statusCode: error.response?.status || 500,
      details: error.response?.data?.details || null,
    };

    // If 401 Unauthorized and not on an auth route, broadcast auth expiration
    if (customError.statusCode === 401 && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/set-password')) {
      window.dispatchEvent(new CustomEvent('meflow:unauthorized'));
    }

    return Promise.reject(customError);
  }
);

export default apiClient;

