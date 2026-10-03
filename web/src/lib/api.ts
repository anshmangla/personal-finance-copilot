import axios from 'axios';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://backend-production-4ca2.up.railway.app';

export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '36258186359-uh4vnk86fv3eoonm3hq2q986lrungpf7.apps.googleusercontent.com';

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

// Response interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_profile');
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const loginWithGoogle = async (idToken: string) => {
  const response = await api.post('/auth/google', { id_token: idToken });
  return response.data;
};

export const devLogin = async (email = 'test@financecopilot.com', name = 'Test User') => {
  const response = await api.post('/auth/dev_login', { email, name });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Summary & Dashboard
export const getSummary = async () => {
  const response = await api.get('/summary');
  return response.data;
};

// Transactions
export const addTransaction = async (data: {
  amount: number;
  merchant: string;
  category: string;
  type?: string;
  date?: string;
}) => {
  const response = await api.post('/add_transaction', data);
  return response.data;
};

export const editTransaction = async (data: {
  id: string;
  amount: number;
  merchant: string;
  category: string;
  type?: string;
  date?: string;
}) => {
  const response = await api.put('/edit_transaction', data);
  return response.data;
};

export const deleteTransaction = async (txId: string) => {
  const response = await api.delete(`/delete_transaction/${txId}`);
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

// Subscriptions
export const getSubscriptions = async () => {
  const response = await api.get('/subscriptions');
  return response.data;
};

export const addSubscription = async (data: {
  name: string;
  amount: number;
  category: string;
  billing_cycle: string;
  next_payment_date: string;
}) => {
  const response = await api.post('/add_subscription', data);
  return response.data;
};

export const editSubscription = async (data: {
  id: string;
  name: string;
  amount: number;
  category: string;
  billing_cycle: string;
  next_payment_date: string;
}) => {
  const response = await api.put('/edit_subscription', data);
  return response.data;
};

export const deleteSubscription = async (subId: string) => {
  const response = await api.delete(`/delete_subscription/${subId}`);
  return response.data;
};

export const paySubscription = async (id: string) => {
  const response = await api.post(`/pay_subscription/${id}`);
  return response.data;
};

// Budgets & Goals
export const getBudgets = async () => {
  const response = await api.get('/budgets');
  return response.data;
};

export const setBudget = async (category: string, limit: number) => {
  const response = await api.post('/set_budget', { category, limit });
  return response.data;
};

export const getGoals = async () => {
  const response = await api.get('/goals');
  return response.data;
};

export const addGoal = async (goal: string) => {
  const response = await api.post('/add_goal', { goal });
  return response.data;
};

export const deleteGoal = async (index: number) => {
  const response = await api.delete(`/delete_goal/${index}`);
  return response.data;
};

// Chat
export const chatWithAgent = async (query: string) => {
  const response = await api.post('/chat', { query });
  return response.data;
};

export const getChatHistory = async () => {
  const response = await api.get('/chat/history');
  return response.data;
};

export const clearChatHistory = async () => {
  const response = await api.delete('/chat/history');
  return response.data;
};

// Exports
export const downloadExportExcel = async () => {
  const response = await api.get('/export/excel', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'finance_export.xlsx');
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadExportPdf = async () => {
  const response = await api.get('/export/pdf', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'summary_report.pdf');
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};
