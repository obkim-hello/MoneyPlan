import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Navigation callback for 401 handling - set by App component
let navigateCallback: ((path: string) => void) | null = null;

export const setNavigateCallback = (fn: (path: string) => void) => {
  navigateCallback = fn;
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 (session expired)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (navigateCallback) {
        navigateCallback('/login');
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const login = async (email: string, password: string) => {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  const response = await api.post('/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  const accessToken = response.data.access_token;
  localStorage.setItem('token', accessToken);
  return accessToken;
};

export const register = async (email: string, password: string) => {
  const response = await api.post('/auth/register', {
    email,
    password,
  });
  return response.data;
};

export const getCurrentUser = async () => {
  const token = localStorage.getItem('token');
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  const response = await api.get('/auth/me');
  return response.data;
};

export { api };
