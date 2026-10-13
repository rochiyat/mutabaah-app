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
