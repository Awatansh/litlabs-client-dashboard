/**
 * Central API client.
 * Handles auth headers, token refresh on 401, and base URL from env.
 */
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: { resolve: (t: string) => void; reject: (e: Error) => void }[] = [];

const processQueue = (error: Error | null, token: string | null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

      if (!refreshToken) {
        isRefreshing = false;
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const resp = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
        const newToken = resp.data.access_token;
        localStorage.setItem('access_token', newToken);
        processQueue(null, newToken);
        if (originalRequest.headers) originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// =====================
// API helpers
// =====================
export const authApi = {
  login: (email: string, password: string) => {
    const params = new URLSearchParams({ username: email, password });
    return api.post('/auth/token', params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  },
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refresh_token: refreshToken }),
};

export const overviewApi = {
  get: () => api.get('/api/overview'),
};

export const marketingApi = {
  overview: (days = 30) => api.get(`/api/marketing/overview?days=${days}`),
  campaigns: () => api.get('/api/marketing/campaigns'),
  channelBreakdown: (days = 30) => api.get(`/api/marketing/channel-breakdown?days=${days}`),
};

export const seoApi = {
  overview: (days = 30) => api.get(`/api/seo/overview?days=${days}`),
  keywords: (limit = 20) => api.get(`/api/seo/keywords?limit=${limit}`),
  topPages: () => api.get('/api/seo/top-pages'),
};

export const projectsApi = {
  list: () => api.get('/api/projects'),
  get: (id: string) => api.get(`/api/projects/${id}`),
};

export const approvalsApi = {
  list: (status = 'pending') => api.get(`/api/approvals?status=${status}`),
  approve: (id: string, comment?: string) => api.post(`/api/approvals/${id}/approve`, { comment }),
  reject: (id: string, comment: string) => api.post(`/api/approvals/${id}/reject`, { comment }),
  requestChanges: (id: string, comment: string) => api.post(`/api/approvals/${id}/request-changes`, { comment }),
};

export const automationApi = {
  summary: (days = 30) => api.get(`/api/automation/summary?days=${days}`),
  recent: (limit = 20) => api.get(`/api/automation/recent?limit=${limit}`),
};

export const notificationsApi = {
  list: () => api.get('/api/notifications'),
  unreadCount: () => api.get('/api/notifications/unread-count'),
  markRead: (id: string) => api.post(`/api/notifications/${id}/read`),
};

export const deliverables = {
  uploadUrl: (filename: string, contentType: string) =>
    api.post(`/api/deliverables/upload-url?filename=${encodeURIComponent(filename)}&content_type=${encodeURIComponent(contentType)}`),
};
