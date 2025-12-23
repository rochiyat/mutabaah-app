import { User, Activity, Record } from '@prisma/client';

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export interface RegisterDTO {
  email: string;
  name: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface CreateActivityDTO {
  name: string;
  category: string;
  target?: number;
  unit?: string;
}

export interface UpdateActivityDTO {
  name?: string;
  category?: string;
  target?: number;
  unit?: string;
  isActive?: boolean;
}

export interface CreateRecordDTO {
  activityId: number;
  date?: Date;
  completed: number;
  notes?: string;
}

export interface UpdateRecordDTO {
  completed?: number;
  notes?: string;
}

export type UserWithoutPassword = Omit<User, 'password'>;
export type ActivityWithRecords = Activity & { records: Record[] };
export type RecordWithActivity = Record & { activity: Activity };
