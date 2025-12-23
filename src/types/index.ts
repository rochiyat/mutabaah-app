export interface User {
  id: number
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Activity {
  id: number
  name: string
  category: string
  target: number
  unit: string
  isActive: boolean
  userId: number
  createdAt: string
  updatedAt: string
}

export interface Record {
  id: number
  date: string
  completed: number
  notes?: string
  activityId: number
  userId: number
  createdAt: string
  updatedAt: string
  activity?: Activity
}

export interface AuthResponse {
  user: User
  token: string
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

export interface WeeklyStats {
  activityId: number
  activityName: string
  data: {
    date: string
    completed: number
    target: number
  }[]
}

export interface MonthlyStats {
  activityId: number
  activityName: string
  totalCompleted: number
  totalTarget: number
  percentage: number
}

export interface DashboardSummary {
  todayCompleted: number
  todayTarget: number
  streak: number
  totalActivities: number
}
