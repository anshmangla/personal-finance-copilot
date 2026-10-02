import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const loginWithGoogle = async (idToken: string) => {
  const response = await api.post('/auth/google', { id_token: idToken });
  return response.data;
};

export const devLogin = async () => {
  const response = await api.post('/auth/dev_login', {});
  return response.data;
};

export const getSummary = async () => {
  const response = await api.get('/summary');
  return response.data;
};

export const getSubscriptions = async () => {
  const response = await api.get('/subscriptions');
  return response.data;
};

export const chatWithAgent = async (query: string) => {
  const response = await api.post('/chat', { query });
  return response.data;
};

export const getBudgets = async () => {
  const response = await api.get('/budgets');
  return response.data;
};

export const getGoals = async () => {
  const response = await api.get('/goals');
  return response.data;
};

export const addTransaction = async (data: any) => {
  const response = await api.post('/add_transaction', data);
  return response.data;
};

export const scanReceipt = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/scan_receipt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const paySubscription = async (id: string) => {
  const response = await api.post(`/pay_subscription/${id}`);
  return response.data;
};
