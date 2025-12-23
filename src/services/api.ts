import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  Activity,
  ActivityRecord,
  AuthResponse,
  ApiError,
} from '@/types';

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
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
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (email: string, name: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { email, name, password }),
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  getCurrentUser: () => api.get<User>('/auth/me'),
};

export const activityAPI = {
  getActivities: () => api.get<Activity[]>('/activities'),
  createActivity: (
    name: string,
    category: string,
    target?: number,
    unit?: string
  ) => api.post<Activity>('/activities', { name, category, target, unit }),
  updateActivity: (id: number, data: any) =>
    api.patch<Activity>(`/activities/${id}`, data),
  deleteActivity: (id: number) => api.delete(`/activities/${id}`),
};

export const recordAPI = {
  getRecords: (activityId?: number, startDate?: string, endDate?: string) =>
    api.get<ActivityRecord[]>('/records', {
      params: { activityId, startDate, endDate },
    }),
  createRecord: (
    activityId: number,
    completed: number,
    notes?: string,
    date?: string
  ) =>
    api.post<ActivityRecord>('/records', {
      activityId,
      completed,
      notes,
      date,
    }),
  updateRecord: (id: number, data: any) =>
    api.patch<ActivityRecord>(`/records/${id}`, data),
  deleteRecord: (id: number) => api.delete(`/records/${id}`),
};

export const statsAPI = {
  getDashboardStats: () => api.get('/stats/dashboard'),
  getWeeklyStats: () => api.get('/stats/weekly'),
  getMonthlyStats: () => api.get('/stats/monthly'),
};

export default api;
