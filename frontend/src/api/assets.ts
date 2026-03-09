import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getAssetSummary = async () => {
  const response = await api.get('/assets/summary');
  return response.data;
};

export const getHoldings = async () => {
  const response = await api.get('/assets/holdings');
  return response.data;
};

export const getAccounts = async () => {
  const response = await api.get('/accounts');
  return response.data;
};
