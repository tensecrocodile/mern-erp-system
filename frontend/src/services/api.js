import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = error?.config?.url || '';
    const isAuthEndpoint = requestUrl.includes('/auth/');

    if (status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('name');
      window.location.href = '/login';
      return Promise.reject(new Error('Session expired. Please sign in again.'));
    }

    const message = error?.response?.data?.message || error.message;
    return Promise.reject(new Error(message));
  }
);

export default api;
