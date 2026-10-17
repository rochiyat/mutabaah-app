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
  ResetPasswordResponse,
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
  GroupMutabaahReport,
  AttendanceReport,
  UserMutabaahReport,
  DuesPlan,
  DuesStatus,
  FinanceAccount,
  FinanceAccountInput,
  Program,
  ProgramDetail,
  ProgramInput,
  ProgramParticipant,
  ProgramParticipantRole,
  Transaction,
  TransactionInput,
  TransactionList,
  TransactionType,
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
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<AuthResponse>('/auth/change-password', { currentPassword, newPassword }),
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
  updateRoles: (id: number, roles: Role[]) => api.patch<User>(`/users/${id}/roles`, { roles }),
  resetPassword: (id: number) => api.post<ResetPasswordResponse>(`/users/${id}/reset-password`),
  updateStatus: (id: number, isActive: boolean) =>
    api.patch<User>(`/users/${id}/status`, { isActive }),
};

type PeriodParams = { start: string; end: string };

// Unduh file lewat axios supaya header Authorization ikut terkirim
const downloadFile = async (url: string, params: Record<string, unknown>, fallbackName: string) => {
  const response = await api.get<Blob>(url, { params, responseType: 'blob' });
  const disposition = String(response.headers['content-disposition'] ?? '');
  const match = disposition.match(/filename="?([^"]+)"?/);
  const href = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = href;
  link.download = match?.[1] ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
};

export const reportAPI = {
  groupMutabaah: (groupId: number, period: PeriodParams) =>
    api.get<GroupMutabaahReport>(`/reports/groups/${groupId}/mutabaah`, { params: period }),
  groupAttendance: (groupId: number, period: PeriodParams) =>
    api.get<AttendanceReport>(`/reports/groups/${groupId}/attendance`, { params: period }),
  kajianAttendance: (kajianId: number, period: PeriodParams) =>
    api.get<AttendanceReport>(`/reports/kajian/${kajianId}/attendance`, { params: period }),
  userMutabaah: (userId: number, period: PeriodParams, groupId?: number) =>
    api.get<UserMutabaahReport>(`/reports/users/${userId}/mutabaah`, {
      params: { ...period, groupId },
    }),
  download: (path: string, period: PeriodParams, extra: Record<string, unknown> = {}) =>
    downloadFile(`/reports/${path}`, { ...period, ...extra, format: 'xlsx' }, 'laporan.xlsx'),
};

export const financeAPI = {
  getAccounts: () => api.get<FinanceAccount[]>('/finance/accounts'),
  getAccount: (id: number) => api.get<FinanceAccount>(`/finance/accounts/${id}`),
  createAccount: (data: FinanceAccountInput) => api.post<FinanceAccount>('/finance/accounts', data),
  updateAccount: (id: number, data: FinanceAccountInput) =>
    api.patch<FinanceAccount>(`/finance/accounts/${id}`, data),
  deleteAccount: (id: number) => api.delete(`/finance/accounts/${id}`),
  getTransactions: (
    id: number,
    params: { start: string; end: string; type?: TransactionType; category?: string }
  ) => api.get<TransactionList>(`/finance/accounts/${id}/transactions`, { params }),
  downloadTransactions: (id: number, params: { start: string; end: string }) =>
    downloadFile(`/finance/accounts/${id}/transactions`, { ...params, format: 'xlsx' }, 'kas.xlsx'),
  createTransaction: (id: number, data: TransactionInput) =>
    api.post<Transaction>(`/finance/accounts/${id}/transactions`, data),
  updateTransaction: (id: number, data: Partial<TransactionInput>) =>
    api.patch<Transaction>(`/finance/transactions/${id}`, data),
  deleteTransaction: (id: number) => api.delete(`/finance/transactions/${id}`),
  createDuesPlan: (accountId: number, data: { name: string; amount: number }) =>
    api.post<DuesPlan>(`/finance/accounts/${accountId}/dues`, data),
  updateDuesPlan: (planId: number, data: { name?: string; amount?: number; isActive?: boolean }) =>
    api.patch<DuesPlan>(`/finance/dues/${planId}`, data),
  deleteDuesPlan: (planId: number) => api.delete(`/finance/dues/${planId}`),
  getDuesStatus: (planId: number, year: number) =>
    api.get<DuesStatus>(`/finance/dues/${planId}/status`, { params: { year } }),
  payDues: (planId: number, data: { userId: number; period: string; amount?: number }) =>
    api.post<Transaction>(`/finance/dues/${planId}/payments`, data),
  cancelDues: (planId: number, userId: number, period: string) =>
    api.delete(`/finance/dues/${planId}/payments`, { params: { userId, period } }),
};

export const programAPI = {
  getList: () => api.get<Program[]>('/programs'),
  getById: (id: number) => api.get<ProgramDetail>(`/programs/${id}`),
  create: (data: ProgramInput) => api.post<Program>('/programs', data),
  update: (id: number, data: ProgramInput) => api.patch<Program>(`/programs/${id}`, data),
  remove: (id: number) => api.delete(`/programs/${id}`),
  join: (id: number) => api.post<ProgramParticipant>(`/programs/${id}/participants`, {}),
  addParticipant: (id: number, userId: number, role: ProgramParticipantRole) =>
    api.post<ProgramParticipant>(`/programs/${id}/participants`, { userId, role }),
  updateParticipant: (id: number, userId: number, role: ProgramParticipantRole) =>
    api.patch(`/programs/${id}/participants/${userId}`, { role }),
  removeParticipant: (id: number, userId: number) =>
    api.delete(`/programs/${id}/participants/${userId}`),
};

export default api;
