import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  User,
  Activity,
  ActivityRecord,
  Group,
  GroupActivity,
  GroupDetail,
  GroupInput,
  GroupMember,
  GroupMemberRole,
  AuthResponse,
  ApiError,
  Role,
  Attendance,
  AttendanceStatus,
  Kajian,
  KajianDetail,
  KajianInput,
  Meeting,
  MeetingDetail,
  MeetingInput,
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
  getGroupById: (id: number) => api.get<GroupDetail>(`/groups/${id}`),
  createGroup: (data: GroupInput) => api.post<GroupDetail>('/groups', data),
  updateGroup: (id: number, data: GroupInput) =>
    api.patch<GroupDetail>(`/groups/${id}`, data),
  deleteGroup: (id: number) => api.delete(`/groups/${id}`),
  getMembers: (groupId: number) =>
    api.get<GroupMember[]>(`/groups/${groupId}/members`),
  addMember: (groupId: number, userId: number, role: GroupMemberRole = 'mutarabbi') =>
    api.post<GroupMember>(`/groups/${groupId}/members`, { userId, role }),
  updateMember: (groupId: number, userId: number, role: GroupMemberRole) =>
    api.patch<GroupMember>(`/groups/${groupId}/members/${userId}`, { role }),
  removeMember: (groupId: number, userId: number) =>
    api.delete(`/groups/${groupId}/members/${userId}`),
  getMeetings: (groupId: number) => api.get<Meeting[]>(`/groups/${groupId}/meetings`),
  createMeeting: (groupId: number, data: MeetingInput) =>
    api.post<Meeting>(`/groups/${groupId}/meetings`, data),
};

export const kajianAPI = {
  getList: () => api.get<Kajian[]>('/kajian'),
  getById: (id: number) => api.get<KajianDetail>(`/kajian/${id}`),
  create: (data: KajianInput) => api.post<Kajian>('/kajian', data),
  update: (id: number, data: KajianInput) => api.patch<Kajian>(`/kajian/${id}`, data),
  remove: (id: number) => api.delete(`/kajian/${id}`),
  createMeeting: (id: number, data: MeetingInput) =>
    api.post<Meeting>(`/kajian/${id}/meetings`, data),
};

export const meetingAPI = {
  getById: (id: number) => api.get<MeetingDetail>(`/meetings/${id}`),
  update: (id: number, data: Partial<MeetingInput>) =>
    api.patch<Meeting>(`/meetings/${id}`, data),
  remove: (id: number) => api.delete(`/meetings/${id}`),
  saveAttendance: (
    id: number,
    entries: { userId: number; status: AttendanceStatus; note?: string | null }[]
  ) => api.put(`/meetings/${id}/attendance`, { entries }),
  removeAttendance: (id: number, userId: number) =>
    api.delete(`/meetings/${id}/attendance/${userId}`),
  checkIn: (id: number) => api.post<Attendance>(`/meetings/${id}/check-in`),
};

export const groupActivityAPI = {
  getGroupActivities: (groupId: number) =>
    api.get<GroupActivity[]>(`/groups/${groupId}/activities`),
  addActivity: (groupId: number, activityId: number, isRequired?: boolean) =>
    api.post<GroupActivity>(`/groups/${groupId}/activities`, {
      activityId,
      isRequired,
    }),
  createActivity: (
    groupId: number,
    data: { name: string; category: string; target?: number; unit?: string; isRequired?: boolean }
  ) => api.post<GroupActivity>(`/groups/${groupId}/activities`, data),
  removeActivity: (groupId: number, activityId: number) =>
    api.delete(`/groups/${groupId}/activities/${activityId}`),
  updateActivity: (groupId: number, activityId: number, data: any) =>
    api.patch<GroupActivity>(
      `/groups/${groupId}/activities/${activityId}`,
      data
    ),
};

export const userAPI = {
  getUsers: (search?: string) => api.get<User[]>('/users', { params: { search } }),
  updateRole: (id: number, role: Role) => api.patch<User>(`/users/${id}/role`, { role }),
  updateStatus: (id: number, isActive: boolean) =>
    api.patch<User>(`/users/${id}/status`, { isActive }),
};

export default api;
