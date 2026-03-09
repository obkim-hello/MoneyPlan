import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export const login = async (email: string, password: string) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);
  const response = await api.post('/auth/login', formData);
  return response.data.access_token;
};

export const getCurrentUser = async () => {
  const token = localStorage.getItem('token');
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  const response = await api.get('/auth/me');
  return response.data;
};
