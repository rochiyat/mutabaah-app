export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  groupId?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  adminId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  admin?: User;
  members?: User[];
}

export interface Activity {
  id: number;
  name: string;
  category: string;
  target: number;
  unit: string;
  isActive: boolean;
  userId?: number | null;
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
