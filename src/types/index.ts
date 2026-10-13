export type Role = 'superadmin' | 'admin' | 'murabbi' | 'user';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PublicUser = Pick<User, 'id' | 'email' | 'name' | 'role' | 'isActive'>;

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
