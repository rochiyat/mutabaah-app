// Peran tambahan akun; tanpa peran tambahan = anggota biasa
export type Role = 'superadmin' | 'admin' | 'operator' | 'bendahara' | 'murabbi';

export interface User {
  id: number;
  email: string;
  name: string;
  roles: Role[];
  isActive: boolean;
  // true setelah password di-reset pengurus
  mustChangePassword?: boolean;
  // Terisi jika login dikunci sementara karena terlalu banyak password salah
  lockedUntil?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Pick<User, 'id' | 'email' | 'name' | 'roles' | 'isActive'>;

export type GroupMemberRole = 'murabbi' | 'mutarabbi';

export interface GroupMember {
  id: number;
  groupId: number;
  userId: number;
  role: GroupMemberRole;
  joinedAt: string;
  user: PublicUser;
}

// Group = halaqoh
export interface Group {
  id: number;
  name: string;
  description?: string | null;
  level?: string | null;
  schedule?: string | null;
  location?: string | null;
  adminId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  admin?: PublicUser;
  memberCount?: number;
  activityCount?: number;
  myRole?: GroupMemberRole | null;
}

export interface GroupDetail extends Group {
  members: GroupMember[];
  activities: GroupActivity[];
  canManage: boolean;
}

export interface GroupInput {
  name?: string;
  description?: string | null;
  level?: string | null;
  schedule?: string | null;
  location?: string | null;
  isActive?: boolean;
  adminId?: number;
}

export interface Activity {
  id: number;
  name: string;
  category: string;
  target: number;
  unit: string;
  isActive: boolean;
  userId?: number | null;
  isGroupActivity?: boolean;
  isRequired?: boolean;
  groups?: { id: number; name: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupActivity {
  id: number;
  groupId: number;
  activityId: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
  activity?: Activity;
}

export interface ActivityRecord {
  id: number;
  date: string;
  completed: number;
  notes?: string;
  activityId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
  activity?: Activity;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface ResetPasswordResponse {
  user: User;
  temporaryPassword: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface WeeklyStats {
  activityId: number;
  activityName: string;
  data: {
    date: string;
    completed: number;
    target: number;
  }[];
}

export interface MonthlyStats {
  activityId: number;
  activityName: string;
  totalCompleted: number;
  totalTarget: number;
  percentage: number;
}

export interface DashboardSummary {
  todayCompleted: number;
  todayTarget: number;
  streak: number;
  totalActivities: number;
}

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpa';

export type AttendanceCounts = Record<AttendanceStatus, number>;

export interface MeetingInput {
  date: string; // yyyy-MM-dd
  startTime?: string | null;
  topic: string;
  speaker?: string | null;
  location?: string | null;
  notes?: string | null;
}

export interface Meeting extends MeetingInput {
  id: number;
  groupId?: number | null;
  kajianId?: number | null;
  createdById?: number | null;
  createdAt: string;
  updatedAt: string;
  counts?: AttendanceCounts;
}

export interface Attendance {
  id: number;
  meetingId: number;
  userId: number;
  status: AttendanceStatus;
  note?: string | null;
  recordedById?: number | null;
  user?: PublicUser;
}

export interface RosterEntry {
  user: PublicUser;
  memberRole: GroupMemberRole | null;
  attendance: Attendance | null;
}

export interface MeetingDetail extends Meeting {
  group: { id: number; name: string } | null;
  kajian: { id: number; title: string } | null;
  attendances: Attendance[];
  roster: RosterEntry[];
  counts: AttendanceCounts;
  myAttendance: Attendance | null;
  canManage: boolean;
  canCheckIn: boolean;
}

export interface KajianInput {
  title?: string;
  speaker?: string | null;
  schedule?: string | null;
  location?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface Kajian {
  id: number;
  title: string;
  speaker?: string | null;
  schedule?: string | null;
  location?: string | null;
  description?: string | null;
  isActive: boolean;
  createdById?: number | null;
  createdBy?: { id: number; name: string } | null;
  canManage: boolean;
  meetingCount?: number;
  lastMeeting?: { date: string; topic: string } | null;
}

export interface KajianDetail extends Kajian {
  meetings: Meeting[];
}

// ===== Laporan =====

export interface ReportPeriod {
  start: string;
  end: string;
  daysCounted?: number;
}

export interface ReportActivity {
  id: number;
  name: string;
  unit: string;
  target: number;
  isRequired: boolean;
}

export interface ProgressValue {
  completed: number;
  target: number;
  percent: number | null;
}

export interface GroupMutabaahReport {
  group: { id: number; name: string };
  period: ReportPeriod;
  activities: (ReportActivity & { avgPercent: number | null })[];
  members: {
    userId: number;
    name: string;
    email: string;
    role: GroupMemberRole;
    daysFilled: number;
    totalCompleted: number;
    totalTarget: number;
    percent: number | null;
    perActivity: Record<number, ProgressValue>;
  }[];
  summary: { memberCount: number; avgPercent: number | null };
}

export interface AttendanceReport {
  group?: { id: number; name: string };
  kajian?: { id: number; title: string };
  period: ReportPeriod;
  meetings: {
    id: number;
    date: string;
    topic: string;
    startTime?: string | null;
    counts: AttendanceCounts;
  }[];
  members: {
    userId: number;
    name: string;
    role: GroupMemberRole | null;
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
    belum: number;
    total: number;
    percent: number | null;
    // status, null = belum diisi, 'na' = tidak dihitung / tidak tercatat
    perMeeting: Record<number, AttendanceStatus | 'na' | null>;
  }[];
  summary: { meetingCount: number; participantCount: number; avgPercent: number | null };
}

export interface UserMutabaahReport {
  user: { id: number; name: string; email: string };
  group: { id: number; name: string } | null;
  period: ReportPeriod;
  activities: (ReportActivity & {
    completed: number;
    targetTotal: number;
    percent: number | null;
  })[];
  days: { date: string; values: Record<number, number> }[];
  summary: { percent: number | null; daysFilled: number };
}

// ===== Keuangan =====

export type TransactionType = 'masuk' | 'keluar';

export interface MoneyTotals {
  masuk: number;
  keluar: number;
}

export interface DuesPlan {
  id: number;
  accountId: number;
  name: string;
  amount: number;
  isActive: boolean;
}

export interface FinanceAccount {
  id: number;
  name: string;
  description?: string | null;
  groupId?: number | null;
  group: { id: number; name: string } | null;
  openingBalance: number;
  isActive: boolean;
  totals: MoneyTotals;
  balance: number;
  canManage: boolean;
  duesPlans?: DuesPlan[];
}

export interface FinanceAccountInput {
  name?: string;
  description?: string | null;
  groupId?: number | null;
  openingBalance?: number;
  isActive?: boolean;
}

export interface Transaction {
  id: number;
  accountId: number;
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  description?: string | null;
  memberId?: number | null;
  programId?: number | null;
  duesPlanId?: number | null;
  duesPeriod?: string | null;
  member?: { id: number; name: string } | null;
  program?: { id: number; name: string } | null;
  createdBy?: { id: number; name: string } | null;
  account?: { id: number; name: string };
}

export interface TransactionInput {
  type: TransactionType;
  category: string;
  amount: number;
  date: string;
  description?: string | null;
  memberId?: number | null;
  programId?: number | null;
}

export interface TransactionList {
  period: { start: string; end: string };
  summary: {
    openingForPeriod: number;
    masuk: number;
    keluar: number;
    closing: number;
    byCategory: { type: TransactionType; category: string; total: number; count: number }[];
  };
  transactions: Transaction[];
}

export interface DuesStatus {
  plan: DuesPlan;
  year: number;
  months: string[];
  members: {
    userId: number;
    name: string;
    isMember: boolean;
    perMonth: Record<string, number>;
    paidMonths: number;
    total: number;
  }[];
  totals: { collected: number; perMonth: Record<string, number> };
  canManage: boolean;
}

// ===== Program =====

export type ProgramStatus = 'rencana' | 'berjalan' | 'selesai' | 'batal';
export type ProgramParticipantRole = 'panitia' | 'peserta';

export interface Program {
  id: number;
  name: string;
  description?: string | null;
  groupId?: number | null;
  group: { id: number; name: string } | null;
  status: ProgramStatus;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  budget?: number | null;
  picId?: number | null;
  pic?: { id: number; name: string; email?: string } | null;
  participantCount?: number;
  myRole?: ProgramParticipantRole | null;
  canManage: boolean;
}

export interface ProgramInput {
  name?: string;
  description?: string | null;
  groupId?: number | null;
  status?: ProgramStatus;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  budget?: number | null;
  picId?: number | null;
}

export interface ProgramParticipant {
  id: number;
  programId: number;
  userId: number;
  role: ProgramParticipantRole;
  joinedAt: string;
  user: { id: number; name: string; email: string };
}

export interface ProgramDetail extends Program {
  createdBy?: { id: number; name: string } | null;
  participants: ProgramParticipant[];
  finance: MoneyTotals & { budget: number | null; realization: number };
  transactions: Transaction[];
  myParticipation: ProgramParticipant | null;
}
