
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  CLASSES = 'CLASSES',
  STUDENTS = 'STUDENTS',
  TEACHERS = 'TEACHERS',
  CATEGORIES = 'CATEGORIES',
  ATTENDANCE = 'ATTENDANCE',
  REPORTS = 'REPORTS',
  AI_INSIGHTS = 'AI_INSIGHTS',
  USERS = 'USERS'
}

export type UserRole = 'ADMIN' | 'TEACHER';

export interface UserSession {
  email: string;
  role: UserRole;
  name?: string;
  teacherId?: string;
  assignedClassId?: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  role: UserRole;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  email?: string;
}

export interface Class {
  id: string;
  name: string;
  teacher: string;
  category: string;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  birthDate: string;
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  classId: string;
  presentStudentIds: string[];
  bibleCount: number;
  titheAmount: number;
  visitorCount: number;
  lessonTheme: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  averageAttendance: number;
  totalTithes: number;
}
