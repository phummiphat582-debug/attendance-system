import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type {
  AttendanceRecord,
  AttendanceStatus,
  CalendarDayInfo,
  MonthlyStats,
  SystemSettings,
  UserProfile,
  WorkType,
} from "../types/attendance";
import { sendCheckInNotification, sendCheckOutNotification } from "../lib/notifications";

const DEFAULT_SETTINGS: SystemSettings = {
  company_name: "ProTech Attendance",
  work_start_time: "08:30",
  late_threshold_minutes: 15,
  notify_webhook_url: "",
  notify_provider: "discord",
  notify_on_checkin: true,
  notify_on_checkout: true,
};

export const DEFAULT_EMPLOYEES: UserProfile[] = [
  {
    id: "emp-1",
    email: "somchai@protech.co.th",
    full_name: "สมชาย สายลุย",
    role: "employee",
    department: "ช่างเทคนิคภาคสนาม",
    avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "emp-2",
    email: "wipawan@protech.co.th",
    full_name: "วิภาวรรณ มีสุข",
    role: "employee",
    department: "ธุรการและประสานงาน",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "emp-3",
    email: "kittipong@protech.co.th",
    full_name: "กิตติพงษ์ สิทธิศักดิ์",
    role: "employee",
    department: "วิศวกรรมระบบ",
    avatar_url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
  },
  {
    id: "emp-4",
    email: "nantiya@protech.co.th",
    full_name: "นันทิยา มั่นคง",
    role: "employee",
    department: "ฝ่ายบริการลูกค้า",
    avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
  },
];

const getTodayDateString = () => new Date().toISOString().split("T")[0];

class AttendanceService {
  private settings: SystemSettings = DEFAULT_SETTINGS;
  private employees: UserProfile[] = DEFAULT_EMPLOYEES;
  private currentProfile: UserProfile = DEFAULT_EMPLOYEES[0];
  private records: AttendanceRecord[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      // 1. Settings
      const savedSettings = localStorage.getItem("attendance_settings");
      if (savedSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      }

      // 2. Employees
      const savedEmployees = localStorage.getItem("attendance_employees");
      if (savedEmployees) {
        const parsed = JSON.parse(savedEmployees);
        this.employees = Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_EMPLOYEES;
      } else {
        this.employees = DEFAULT_EMPLOYEES;
        localStorage.setItem("attendance_employees", JSON.stringify(DEFAULT_EMPLOYEES));
      }

      // 3. Current active profile
      const savedProfile = localStorage.getItem("protech_user_profile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        const match = this.employees.find((e) => e.id === parsed.id);
        this.currentProfile = match || this.employees[0] || DEFAULT_EMPLOYEES[0];
      } else {
        this.currentProfile = this.employees[0] || DEFAULT_EMPLOYEES[0];
      }

      // 4. Attendance Records
      const savedRecords = localStorage.getItem("attendance_records");
      if (savedRecords) {
        const parsed = JSON.parse(savedRecords);
        this.records = Array.isArray(parsed) ? parsed : [];
      } else {
        this.records = [];
      }

      // If no records exist or empty, pre-seed realistic records for Sept 2026
      if (this.records.length === 0) {
        this.records = this.generateSampleRecords();
        this.saveRecords();
      }
    } catch (e) {
      console.error("Failed to load local storage:", e);
      this.employees = DEFAULT_EMPLOYEES;
      this.currentProfile = DEFAULT_EMPLOYEES[0];
      this.records = [];
    }
  }

  private generateSampleRecords(): AttendanceRecord[] {
    return [
      {
        id: "seed-1",
        user_id: "emp-1",
        date: "2026-09-01",
        check_in_time: "2026-09-01T08:14:00+07:00",
        check_out_time: "2026-09-01T17:35:00+07:00",
        work_type: "office",
        status: "on_time",
        check_in_note: "เข้างานปกติ",
        location: "สำนักงานใหญ่ ชั้น 3",
      },
      {
        id: "seed-2",
        user_id: "emp-1",
        date: "2026-09-02",
        check_in_time: "2026-09-02T08:22:00+07:00",
        check_out_time: "2026-09-02T17:40:00+07:00",
        work_type: "office",
        status: "on_time",
        check_in_note: "เข้างานปกติ",
        location: "สำนักงานใหญ่ ชั้น 3",
      },
      {
        id: "seed-3",
        user_id: "emp-1",
        date: "2026-09-03",
        check_in_time: "2026-09-03T08:52:00+07:00",
        check_out_time: "2026-09-03T18:05:00+07:00",
        work_type: "onsite",
        status: "late",
        check_in_note: "เดินทางตรวจเช็คหน้างาน ไซต์ A",
        location: "ไซต์งาน นิคมฯ บางกะดี",
      },
      {
        id: "seed-4",
        user_id: "emp-1",
        date: "2026-09-04",
        check_in_time: "2026-09-04T08:10:00+07:00",
        check_out_time: "2026-09-04T17:15:00+07:00",
        work_type: "wfh",
        status: "on_time",
        check_in_note: "ทำงาน Work From Home",
        location: "บ้านพัก กทม.",
      },
      {
        id: "seed-5",
        user_id: "emp-1",
        date: "2026-09-07",
        check_in_time: "2026-09-07T08:25:00+07:00",
        check_out_time: "2026-09-07T17:45:00+07:00",
        work_type: "office",
        status: "on_time",
        check_in_note: "",
        location: "สำนักงานใหญ่",
      },
      {
        id: "seed-6",
        user_id: "emp-1",
        date: "2026-09-08",
        check_in_time: "2026-09-08T08:18:00+07:00",
        check_out_time: "2026-09-08T17:30:00+07:00",
        work_type: "office",
        status: "on_time",
        check_in_note: "",
        location: "สำนักงานใหญ่",
      },
      {
        id: "seed-7",
        user_id: "emp-1",
        date: "2026-09-09",
        check_in_time: "2026-09-09T08:48:00+07:00",
        check_out_time: "2026-09-09T17:50:00+07:00",
        work_type: "office",
        status: "late",
        check_in_note: "รถติดช่วงเช้า เส้นวิภาวดี",
        location: "สำนักงานใหญ่",
      },
      {
        id: "seed-8",
        user_id: "emp-1",
        date: "2026-09-10",
        check_in_time: "2026-09-10T08:15:00+07:00",
        check_out_time: "2026-09-10T17:35:00+07:00",
        work_type: "onsite",
        status: "on_time",
        check_in_note: "ตรวจระบบลูกค้า บจก.ไทยซอฟท์",
        location: "ไซต์งาน สาทร",
      },
      {
        id: "seed-9",
        user_id: "emp-2",
        date: "2026-09-10",
        check_in_time: "2026-09-10T08:20:00+07:00",
        check_out_time: "2026-09-10T17:30:00+07:00",
        work_type: "office",
        status: "on_time",
        check_in_note: "งานจัดซื้อและสรุปยอด",
        location: "สำนักงานใหญ่",
      },
      {
        id: "seed-10",
        user_id: "emp-3",
        date: "2026-09-10",
        check_in_time: "2026-09-10T08:12:00+07:00",
        check_out_time: "2026-09-10T17:30:00+07:00",
        work_type: "office",
        status: "on_time",
        check_in_note: "",
        location: "สำนักงานใหญ่",
      },
    ];
  }

  private saveRecords() {
    try {
      localStorage.setItem("attendance_records", JSON.stringify(this.records));
    } catch {}
  }

  private saveEmployees() {
    try {
      localStorage.setItem("attendance_employees", JSON.stringify(this.employees));
    } catch {}
  }

  // --- EMPLOYEE MANAGEMENT (MULTI-USER) ---

  getEmployees(): UserProfile[] {
    return [...this.employees];
  }

  addEmployee(fullName: string, department: string, email?: string, avatarUrl?: string): UserProfile {
    const newEmp: UserProfile = {
      id: "emp-" + Date.now(),
      email: email || "",
      full_name: fullName.trim(),
      department: department.trim() || "ฝ่ายปฏิบัติการ",
      role: "employee",
      avatar_url:
        avatarUrl || "https://api.dicebear.com/7.x/initials/svg?seed=" + encodeURIComponent(fullName.trim()),
    };
    this.employees.push(newEmp);
    this.saveEmployees();
    return newEmp;
  }

  updateEmployee(id: string, fullName: string, department: string, avatarUrl?: string): UserProfile | null {
    const idx = this.employees.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.employees[idx] = {
      ...this.employees[idx],
      full_name: fullName.trim(),
      department: department.trim(),
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    };
    if (this.currentProfile.id === id) {
      this.currentProfile = this.employees[idx];
      localStorage.setItem("protech_user_profile", JSON.stringify(this.currentProfile));
    }
    this.saveEmployees();
    return this.employees[idx];
  }

  updateEmployeePhoto(id: string, avatarUrl: string): UserProfile | null {
    const idx = this.employees.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.employees[idx] = {
      ...this.employees[idx],
      avatar_url: avatarUrl,
    };
    if (this.currentProfile.id === id) {
      this.currentProfile = this.employees[idx];
      localStorage.setItem("protech_user_profile", JSON.stringify(this.currentProfile));
    }
    this.saveEmployees();
    return this.employees[idx];
  }

  deleteEmployee(id: string): boolean {
    if (this.employees.length <= 1) return false;
    this.employees = this.employees.filter((e) => e.id !== id);
    this.records = this.records.filter((r) => r.user_id !== id);
    if (this.currentProfile.id === id) {
      this.currentProfile = this.employees[0];
      localStorage.setItem("protech_user_profile", JSON.stringify(this.currentProfile));
    }
    this.saveEmployees();
    this.saveRecords();
    return true;
  }

  setActiveEmployee(id: string): UserProfile {
    const found = this.employees.find((e) => e.id === id);
    if (found) {
      this.currentProfile = found;
      try {
        localStorage.setItem("protech_user_profile", JSON.stringify(found));
      } catch {}
    }
    return this.currentProfile;
  }

  getActiveEmployee(): UserProfile {
    return this.currentProfile;
  }

  async getAllEmployeesTodayStatus(): Promise<
    Array<{
      employee: UserProfile;
      record: AttendanceRecord | null;
      statusText: string;
    }>
  > {
    const today = getTodayDateString();
    return this.employees.map((emp) => {
      const rec = this.records.find((r) => r.user_id === emp.id && r.date === today) || null;
      let statusText = "ยังไม่ได้ลงเวลา";
      if (rec) {
        const inTime = new Date(rec.check_in_time).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        });
        if (rec.check_out_time) {
          const outTime = new Date(rec.check_out_time).toLocaleTimeString("th-TH", {
            hour: "2-digit",
            minute: "2-digit",
          });
          statusText = "เข้า " + inTime + " น. • ออก " + outTime + " น.";
        } else {
          statusText = "เข้างาน " + inTime + " น. (" + (rec.status === "on_time" ? "ตรงเวลา" : "สาย") + ")";
        }
      }
      return {
        employee: emp,
        record: rec,
        statusText,
      };
    });
  }

  // --- USER PROFILE & AUTH (COMPATIBILITY) ---

  async signInWithGitHub(): Promise<{ error?: any }> {
    if (!isSupabaseConfigured) return {};
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });
    return { error };
  }

  async signInWithEmail(email: string, password: string): Promise<{ user?: any; error?: any }> {
    if (!isSupabaseConfigured) return { user: this.currentProfile };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data.user, error };
  }

  async signUpWithEmail(email: string, password: string, fullName: string, department: string): Promise<{ error?: any }> {
    if (!isSupabaseConfigured) {
      await this.updateUserProfile({ full_name: fullName, department });
      return {};
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, department } },
    });
    return { error };
  }

  getMockProfiles(): UserProfile[] {
    return this.employees;
  }

  setActiveMockUser(userId: string) {
    this.setActiveEmployee(userId);
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    if (isSupabaseConfigured) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (profile) return profile as UserProfile;
      }
    }
    return this.currentProfile;
  }

  async updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    this.currentProfile = { ...this.currentProfile, ...profile };
    try {
      localStorage.setItem("protech_user_profile", JSON.stringify(this.currentProfile));
    } catch {}

    const idx = this.employees.findIndex((e) => e.id === this.currentProfile.id);
    if (idx !== -1) {
      this.employees[idx] = { ...this.employees[idx], ...profile };
      this.saveEmployees();
    }
    return this.currentProfile;
  }

  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  }

  // --- ATTENDANCE ACTIONS ---

  async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
    const today = getTodayDateString();
    return this.records.find((r) => r.user_id === userId && r.date === today) || null;
  }

  async checkIn(params: {
    userId: string;
    workType: WorkType;
    note?: string;
    location?: string;
    customTime?: string;
    customDate?: string;
  }): Promise<{ record: AttendanceRecord | null; error?: string }> {
    const today = params.customDate || (params.customTime ? params.customTime.split("T")[0] : getTodayDateString());
    const now = params.customTime ? new Date(params.customTime) : new Date();
    const settings = await this.getSettings();

    const [startHour, startMinute] = (settings.work_start_time || "08:30").split(":").map(Number);
    const deadline = new Date(now);
    deadline.setHours(startHour, startMinute + (settings.late_threshold_minutes || 0), 0, 0);

    const status: AttendanceStatus = now > deadline ? "late" : "on_time";

    const existing = this.records.find((r) => r.user_id === params.userId && r.date === today);
    if (existing) {
      return { record: existing, error: "มีบันทึกเวลาของวันที่ระบุอยู่แล้ว (สามารถกดแก้ไขหรือลบเพื่อลงใหม่ได้)" };
    }

    const emp = this.employees.find((e) => e.id === params.userId) || this.currentProfile;

    const newRecord: AttendanceRecord = {
      id: "att-" + Date.now(),
      user_id: params.userId,
      date: today,
      check_in_time: now.toISOString(),
      check_out_time: null,
      work_type: params.workType,
      status,
      check_in_note: params.note || "",
      location: params.location || "บันทึกเวลาผ่านเว็บแอป",
      profile: emp,
    };

    this.records.unshift(newRecord);
    this.saveRecords();

    sendCheckInNotification(newRecord, emp, settings).catch(console.error);

    return { record: newRecord };
  }

  async checkOut(params: {
    recordId: string;
    note?: string;
    customTime?: string;
  }): Promise<{ record: AttendanceRecord | null; error?: string }> {
    const now = params.customTime ? new Date(params.customTime) : new Date();
    const settings = await this.getSettings();

    const index = this.records.findIndex((r) => r.id === params.recordId);
    if (index === -1) {
      return { record: null, error: "ไม่พบข้อมูลบันทึกเวลาเข้างาน" };
    }

    this.records[index] = {
      ...this.records[index],
      check_out_time: now.toISOString(),
      check_out_note: params.note !== undefined ? params.note : this.records[index].check_out_note,
    };
    this.saveRecords();

    const emp = this.employees.find((e) => e.id === this.records[index].user_id) || this.currentProfile;
    sendCheckOutNotification(this.records[index], emp, settings).catch(console.error);

    return { record: this.records[index] };
  }

  deleteRecord(recordId: string): boolean {
    const prevCount = this.records.length;
    this.records = this.records.filter((r) => r.id !== recordId);
    if (this.records.length !== prevCount) {
      this.saveRecords();
      return true;
    }
    return false;
  }

  async addManualRecord(params: {
    userId: string;
    date: string;
    checkInTime: string; // HH:mm
    checkOutTime?: string; // HH:mm
    workType: WorkType;
    status: AttendanceStatus;
    note?: string;
    location?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const existingIndex = this.records.findIndex((r) => r.user_id === params.userId && r.date === params.date);

    const checkInIso = params.date + "T" + params.checkInTime + ":00+07:00";
    const checkOutIso = params.checkOutTime ? params.date + "T" + params.checkOutTime + ":00+07:00" : null;

    const emp = this.employees.find((e) => e.id === params.userId) || this.currentProfile;

    const newRecord: AttendanceRecord = {
      id: existingIndex !== -1 ? this.records[existingIndex].id : "man-" + Date.now(),
      user_id: params.userId,
      date: params.date,
      check_in_time: checkInIso,
      check_out_time: checkOutIso,
      work_type: params.workType,
      status: params.status,
      check_in_note: params.note || "",
      location: params.location || "บันทึกเวลาเพิ่มเติม",
      profile: emp,
    };

    if (existingIndex !== -1) {
      this.records[existingIndex] = newRecord;
    } else {
      this.records.unshift(newRecord);
    }
    this.saveRecords();
    return { success: true };
  }

  async getUserHistory(userId: string): Promise<AttendanceRecord[]> {
    return this.records
      .filter((r) => r.user_id === userId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  // --- FULL MONTHLY CALENDAR DATA ---

  async getMonthlyCalendarData(
    userId: string,
    year: number,
    month: number // 1-12
  ): Promise<{
    days: CalendarDayInfo[];
    stats: MonthlyStats;
  }> {
    const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    const monthStr = String(month).padStart(2, "0");
    const prefix = year + "-" + monthStr;

    const userRecords = this.records.filter((r) => r.user_id === userId && r.date.startsWith(prefix));
    const recordMap = new Map<string, AttendanceRecord>();
    userRecords.forEach((r) => recordMap.set(r.date, r));

    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const todayStr = getTodayDateString();

    const days: CalendarDayInfo[] = [];

    let totalWorkDays = 0;
    let attendedDays = 0;
    let onTimeDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let wfhDays = 0;
    let officeDays = 0;
    let onsiteDays = 0;
    let totalHours = 0;

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = prefix + "-" + String(day).padStart(2, "0");
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;

      const record = recordMap.get(dateStr);

      let status: CalendarDayInfo["status"] = "absent";

      if (isFuture) {
        status = "future";
      } else if (record) {
        status = record.status === "on_time" ? "on_time" : "late";
        attendedDays++;
        if (record.status === "on_time") onTimeDays++;
        else lateDays++;

        if (record.work_type === "office") officeDays++;
        else if (record.work_type === "wfh") wfhDays++;
        else if (record.work_type === "onsite") onsiteDays++;

        if (record.check_in_time && record.check_out_time) {
          const start = new Date(record.check_in_time).getTime();
          const end = new Date(record.check_out_time).getTime();
          const diffHours = (end - start) / (1000 * 60 * 60);
          if (diffHours > 0) totalHours += diffHours;
        } else {
          totalHours += 8; // standard work day default
        }
      } else if (isWeekend) {
        status = "weekend";
      } else if (isToday) {
        status = "pending";
      } else {
        status = "absent";
        absentDays++;
      }

      if (!isWeekend && !isFuture) {
        totalWorkDays++;
      }

      days.push({
        date: dateStr,
        dayNumber: day,
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        isWeekend,
        isToday,
        isFuture,
        record,
        status,
      });
    }

    const attendanceRate = totalWorkDays > 0 ? Math.round((attendedDays / totalWorkDays) * 100) : 100;
    const onTimeRate = attendedDays > 0 ? Math.round((onTimeDays / attendedDays) * 100) : 100;

    return {
      days,
      stats: {
        totalWorkDays,
        attendedDays,
        onTimeDays,
        lateDays,
        absentDays,
        wfhDays,
        officeDays,
        onsiteDays,
        attendanceRate,
        onTimeRate,
        totalHours: Math.round(totalHours * 10) / 10,
      },
    };
  }

  // --- BACKWARD COMPATIBLE 30-DAY CALL ---

  async getMember30DayAttendance(userId: string) {
    const now = new Date();
    const result = await this.getMonthlyCalendarData(userId, now.getFullYear(), now.getMonth() + 1);
    return {
      days: result.days.map((d) => ({
        date: d.date,
        dayOfWeek: d.dayOfWeek,
        dayName: d.dayName,
        formattedDate: d.dayNumber + " " + new Date(d.date).toLocaleDateString("th-TH", { month: "short" }),
        isWeekend: d.isWeekend,
        isToday: d.isToday,
        record: d.record,
        status: d.status,
      })),
      stats: result.stats,
    };
  }

  // --- SETTINGS ---

  async getSettings(): Promise<SystemSettings> {
    return this.settings;
  }

  async updateSettings(settings: SystemSettings): Promise<{ success: boolean; error?: string }> {
    this.settings = { ...settings };
    try {
      localStorage.setItem("attendance_settings", JSON.stringify(settings));
    } catch {}
    return { success: true };
  }

  async getTodayTeamAttendance() {
    const today = getTodayDateString();
    const records = this.records.filter((r) => r.date === today);
    const checkedIn = records.length;
    const late = records.filter((r) => r.status === "late").length;
    const onTime = records.filter((r) => r.status === "on_time").length;
    return {
      records,
      summary: {
        totalMembers: this.employees.length,
        checkedIn,
        pending: Math.max(0, this.employees.length - checkedIn),
        late,
        onTime,
      },
    };
  }

  subscribeToAttendance(_onNewRecord: (record: AttendanceRecord) => void) {
    return () => {};
  }
}

export const attendanceService = new AttendanceService();
