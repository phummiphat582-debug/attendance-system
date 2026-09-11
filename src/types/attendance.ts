export type Role = 'employee' | 'manager' | 'admin';

export type WorkType = 'office' | 'wfh' | 'onsite';

export type AttendanceStatus = 'on_time' | 'late' | 'pending' | 'absent';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: Role;
  department: string;
  github_username?: string;
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  check_in_time: string; // ISO or HH:mm:ss
  check_out_time?: string | null;
  work_type: WorkType;
  check_in_note?: string;
  check_out_note?: string;
  status: AttendanceStatus;
  location?: string;
  created_at?: string;
  updated_at?: string;
  // joined profile
  profile?: UserProfile;
}

export interface SystemSettings {
  company_name: string;
  work_start_time: string; // HH:mm (e.g. "09:00")
  late_threshold_minutes: number; // e.g. 15
  notify_webhook_url: string;
  notify_provider: 'discord' | 'telegram' | 'line';
  notify_on_checkin: boolean;
  notify_on_checkout: boolean;
}

export interface CalendarDayInfo {
  date: string; // YYYY-MM-DD
  dayNumber: number; // 1-31
  dayOfWeek: number; // 0=Sun..6=Sat
  dayName: string;
  isWeekend: boolean;
  isToday: boolean;
  isFuture: boolean;
  record?: AttendanceRecord;
  status: 'on_time' | 'late' | 'weekend' | 'absent' | 'pending' | 'future';
}

export interface MonthlyStats {
  totalWorkDays: number;
  attendedDays: number;
  onTimeDays: number;
  lateDays: number;
  absentDays: number;
  wfhDays: number;
  officeDays: number;
  onsiteDays: number;
  attendanceRate: number;
  onTimeRate: number;
  totalHours: number;
}
