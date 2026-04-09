import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  google: (data) => api.post('/auth/google', data),
};

export const marketAPI = {
  getPrice: (symbol) => api.get(`/market/price/${symbol}`),
  getKlines: (symbol, interval, limit = 100) =>
    api.get(`/market/klines/${symbol}`, { params: { interval, limit } }),
  getIndicators: (symbol, strategyType, interval) =>
    api.get(`/market/indicators/${symbol}`, { params: { strategyType, interval } }),
};

export const signalAPI = {
  generate: (symbol, strategyType, timeframe) =>
    api.post('/signals/generate', null, { params: { symbol, strategyType, timeframe } }),
  getAll: () => api.get('/signals'),
  getByStrategy: (strategyType, symbol) =>
    strategyType
      ? api.get(`/signals/strategy/${strategyType}`, { params: { symbol } })
      : api.get('/signals'),
};

export const tradeAPI = {
  getAll: () => api.get('/trades'),
  getOpen: () => api.get('/trades/open'),
  close: (tradeId) => api.post(`/trades/${tradeId}/close`),
};

export const backtestAPI = {
  run: (data) => api.post('/backtest/run', data),
};

export const reportAPI = {
  getAll: () => api.get('/reports'),
  getByStrategy: (strategyType, symbol) =>
    strategyType
      ? api.get(`/reports/strategy/${strategyType}`, { params: { symbol } })
      : api.get('/reports'),
};

export const strategyAPI = {
  getAll: () => api.get('/strategies'),
  create: (data) => api.post('/strategies', data),
  toggle: (id) => api.put(`/strategies/${id}/toggle`),
  delete: (id) => api.delete(`/strategies/${id}`),
};

export const userAPI = {
  getTelegram: () => api.get('/user/telegram'),
  updateTelegram: (chatId) => api.put('/user/telegram', null, { params: { chatId } }),
  testTelegram: () => api.post('/user/telegram/test'),
};

export default api;
