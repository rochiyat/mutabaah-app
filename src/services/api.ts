import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  Activity,
  ActivityRecord,
  Group,
  GroupActivity,
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

export const groupAPI = {
  getGroups: () => api.get<Group[]>('/groups'),
  getGroupById: (id: number) => api.get<Group>(`/groups/${id}`),
  createGroup: (name: string, description?: string) =>
    api.post<Group>('/groups', { name, description }),
  updateGroup: (id: number, data: any) =>
    api.patch<Group>(`/groups/${id}`, data),
  deleteGroup: (id: number) => api.delete(`/groups/${id}`),
  addMember: (groupId: number, userId: number) =>
    api.post(`/groups/${groupId}/members`, { userId }),
  removeMember: (groupId: number, userId: number) =>
    api.delete(`/groups/${groupId}/members/${userId}`),
  getMembers: (groupId: number) =>
    api.get<User[]>(`/groups/${groupId}/members`),
};

export const groupActivityAPI = {
  getGroupActivities: (groupId: number) =>
    api.get<GroupActivity[]>(`/groups/${groupId}/activities`),
  addActivity: (groupId: number, activityId: number, isRequired?: boolean) =>
    api.post<GroupActivity>(`/groups/${groupId}/activities`, {
      activityId,
      isRequired,
    }),
  removeActivity: (groupId: number, activityId: number) =>
    api.delete(`/groups/${groupId}/activities/${activityId}`),
  updateActivity: (groupId: number, activityId: number, data: any) =>
    api.patch<GroupActivity>(
      `/groups/${groupId}/activities/${activityId}`,
      data
    ),
};

export default api;
