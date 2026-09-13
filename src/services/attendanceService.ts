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
import { sendCheckInNotification } from "../lib/notifications";

const DEFAULT_SETTINGS: SystemSettings = {
  company_name: "ProTech Attendance",
  work_start_time: "08:30",
  late_threshold_minutes: 15,
  notify_webhook_url: "",
  notify_provider: "discord",
  notify_on_checkin: true,
  notify_on_checkout: false,
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

export const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayDateString = () => getLocalDateString(new Date());

const toSafeTimestamp = (val: string | undefined | null, date: string): string | null => {
  if (!val) return null;
  const trimmed = String(val).trim();
  if (!trimmed) return null;
  if (trimmed.includes('T')) return trimmed;
  const timePart = trimmed.length === 5 ? `${trimmed}:00` : trimmed;
  return `${date}T${timePart}+07:00`;
};

class AttendanceService {
  private settings: SystemSettings = DEFAULT_SETTINGS;
  private employees: UserProfile[] = DEFAULT_EMPLOYEES;
  private currentProfile: UserProfile = DEFAULT_EMPLOYEES[0];
  private records: AttendanceRecord[] = [];
  private isCloudConnected = false;
  private listeners: Array<() => void> = [];
  private pollInterval: any = null;

  constructor() {
    this.loadFromStorage();
    this.initCloudSync();
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
    } catch (e) {
      console.error("Failed to load local storage:", e);
      this.employees = DEFAULT_EMPLOYEES;
      this.currentProfile = DEFAULT_EMPLOYEES[0];
      this.records = [];
    }
  }

  // --- CLOUD SYNC & REALTIME SUBSCRIPTION ---

  public async initCloudSync() {
    if (!isSupabaseConfigured) {
      this.isCloudConnected = false;
      return;
    }

    try {
      const { error } = await supabase
        .from("attendance_records")
        .select("id")
        .limit(1);

      if (error) {
        console.warn("Supabase attendance_records not ready yet:", error.message);
        this.isCloudConnected = false;
        return;
      }

      // If successful, we have real-time cloud connection!
      this.isCloudConnected = true;
      console.log("🟢 Connected to Supabase Cloud Realtime Database successfully!");

      // Initial fetch from cloud
      await this.syncFromCloud();

      // Subscribe to Realtime Changes
      this.setupRealtimeSubscription();

      // Polling fallback every 6 seconds to ensure absolute consistency
      if (!this.pollInterval) {
        this.pollInterval = setInterval(() => {
          if (this.isCloudConnected) {
            this.syncFromCloud(false);
          }
        }, 6000);
      }
    } catch (err) {
      console.warn("Cloud check failed:", err);
      this.isCloudConnected = false;
    }
  }

  private setupRealtimeSubscription() {
    if (!isSupabaseConfigured) return;

    try {
      supabase
        .channel("attendance_realtime_channel")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "attendance_records" },
          async (payload) => {
            console.log("⚡ Supabase Realtime event received:", payload.eventType);
            await this.syncFromCloud(true);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "attendance_employees" },
          async (payload) => {
            console.log("⚡ Supabase Realtime employee event:", payload.eventType);
            await this.syncEmployeesFromCloud(true);
          }
        )
        .subscribe((status) => {
          console.log("Supabase Realtime subscription status:", status);
        });
    } catch (err) {
      console.error("Realtime subscription error:", err);
    }
  }

  public async syncFromCloud(notify = false) {
    if (!this.isCloudConnected || !isSupabaseConfigured) return;

    try {
      const { data: cloudRecords, error } = await supabase
        .from("attendance_records")
        .select("*")
        .order("date", { ascending: false });

      if (!error && cloudRecords) {
        // If cloud has no records yet but local device has records, migrate local to cloud!
        if (cloudRecords.length === 0 && this.records.length > 0) {
          console.log("🚀 Migrating local records to Supabase cloud...", this.records.length);
          for (const rec of this.records) {
            try {
              const safeIn = toSafeTimestamp(rec.check_in_time, rec.date) || new Date().toISOString();
              const safeOut = toSafeTimestamp(rec.check_out_time, rec.date);
              await supabase.from("attendance_records").upsert({
                id: rec.id,
                user_id: rec.user_id,
                date: rec.date,
                check_in_time: safeIn,
                check_out_time: safeOut,
                work_type: rec.work_type,
                status: rec.status,
                check_in_note: rec.check_in_note || "",
                check_out_note: rec.check_out_note || "",
                location: rec.location || "",
                user_name: rec.profile?.full_name || "",
                department: rec.profile?.department || "",
              });
            } catch (migErr) {
              console.warn("Record migration warning:", migErr);
            }
          }
          // After migration, notify to ensure consistency
          if (notify) {
            this.notifyListeners();
          }
        } else {
          const mappedRecords: AttendanceRecord[] = cloudRecords.map((r: any) => ({
            id: r.id,
            user_id: r.user_id,
            date: r.date,
            check_in_time: r.check_in_time,
            check_out_time: r.check_out_time || null,
            work_type: (r.work_type as WorkType) || "office",
            status: (r.status as AttendanceStatus) || "on_time",
            check_in_note: r.check_in_note || "",
            check_out_note: r.check_out_note || "",
            location: r.location || "",
            profile: this.employees.find((e) => e.id === r.user_id),
          }));

          // Check if there are changes
          const isChanged = JSON.stringify(mappedRecords) !== JSON.stringify(this.records);
          if (isChanged) {
            this.records = mappedRecords;
            this.saveRecords();
            if (notify) {
              this.notifyListeners();
            }
          }
        }
      }

      await this.syncEmployeesFromCloud(notify);
    } catch (err) {
      console.error("Error syncing from cloud:", err);
    }
  }

  public async syncEmployeesFromCloud(notify = false) {
    if (!this.isCloudConnected || !isSupabaseConfigured) return;

    try {
      const { data: cloudEmps, error } = await supabase
        .from("attendance_employees")
        .select("*")
        .order("id");

      if (!error && cloudEmps) {
        if (cloudEmps.length === 0 && this.employees.length > 0) {
          console.log("🚀 Migrating local employees to Supabase cloud...", this.employees.length);
          for (const emp of this.employees) {
            try {
              await supabase.from("attendance_employees").upsert({
                id: emp.id,
                full_name: emp.full_name,
                department: emp.department,
                role: emp.role || "employee",
                email: emp.email || "",
                avatar_url: emp.avatar_url,
              });
            } catch (migErr) {
              console.warn("Employee migration warning:", migErr);
            }
          }
        } else if (cloudEmps.length > 0) {
          const mappedEmps: UserProfile[] = cloudEmps.map((e: any) => ({
            id: e.id,
            full_name: e.full_name,
            department: e.department || "ฝ่ายปฏิบัติการ",
            role: e.role || "employee",
            email: e.email || "",
            avatar_url: e.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(e.full_name)}`,
          }));

          const isChanged = JSON.stringify(mappedEmps) !== JSON.stringify(this.employees);
          if (isChanged) {
            this.employees = mappedEmps;
            this.saveEmployees();
            if (notify) {
              this.notifyListeners();
            }
          }
        }
      }
    } catch (err) {
      console.error("Error syncing employees from cloud:", err);
    }
  }

  public subscribeToUpdates(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback();
      } catch (err) {
        console.error("Listener error:", err);
      }
    });
  }

  public isRealtimeConnected(): boolean {
    return this.isCloudConnected;
  }

  public async recheckConnection(): Promise<{ connected: boolean; message: string }> {
    await this.initCloudSync();
    if (this.isCloudConnected) {
      return { connected: true, message: "เชื่อมต่อฐานข้อมูลคลาวด์เรียลไทม์สำเร็จ ทุกเครื่องซิงค์ตรงกัน 100%" };
    }
    return {
      connected: false,
      message: "ยังไม่พบตาราง attendance_records ใน Supabase กรุณารันคำสั่ง SQL สร้างตาราง",
    };
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

  // --- EMPLOYEE MANAGEMENT ---

  getEmployees(): UserProfile[] {
    return [...this.employees];
  }

  getMockProfiles(): UserProfile[] {
    return this.employees;
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    return this.currentProfile;
  }

  async updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    this.currentProfile = { ...this.currentProfile, ...profile };
    return this.currentProfile;
  }

  async signInWithGitHub(): Promise<{ error: any }> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'github' });
      return { error };
    }
    return { error: null };
  }

  async signInWithEmail(email: string, password: string): Promise<any> {
    if (isSupabaseConfigured) {
      return await supabase.auth.signInWithPassword({ email, password });
    }
    return { error: null };
  }

  async signUpWithEmail(email: string, password: string, fullName: string, role?: string): Promise<any> {
    if (isSupabaseConfigured) {
      return await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: role || 'employee' } },
      });
    }
    return { error: null };
  }

  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  }

  async addEmployee(fullName: string, department: string, email?: string, avatarUrl?: string): Promise<UserProfile> {
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

    if (this.isCloudConnected && isSupabaseConfigured) {
      try {
        await supabase.from("attendance_employees").upsert({
          id: newEmp.id,
          full_name: newEmp.full_name,
          department: newEmp.department,
          email: newEmp.email,
          avatar_url: newEmp.avatar_url,
        });
      } catch (e) {
        console.error("Cloud employee upsert error:", e);
      }
    }

    this.notifyListeners();
    return newEmp;
  }

  async updateEmployee(id: string, fullName: string, department: string, avatarUrl?: string): Promise<UserProfile | null> {
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

    if (this.isCloudConnected && isSupabaseConfigured) {
      try {
        await supabase.from("attendance_employees").upsert({
          id: this.employees[idx].id,
          full_name: this.employees[idx].full_name,
          department: this.employees[idx].department,
          email: this.employees[idx].email,
          avatar_url: this.employees[idx].avatar_url,
        });
      } catch (e) {
        console.error("Cloud employee update error:", e);
      }
    }

    this.notifyListeners();
    return this.employees[idx];
  }

  async updateEmployeePhoto(id: string, avatarUrl: string): Promise<UserProfile | null> {
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

    if (this.isCloudConnected && isSupabaseConfigured) {
      try {
        await supabase.from("attendance_employees").upsert({
          id: this.employees[idx].id,
          full_name: this.employees[idx].full_name,
          department: this.employees[idx].department,
          avatar_url: avatarUrl,
        });
      } catch (e) {
        console.error("Cloud photo update error:", e);
      }
    }

    this.notifyListeners();
    return this.employees[idx];
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const prevCount = this.employees.length;
    this.employees = this.employees.filter((e) => e.id !== id);
    if (this.employees.length !== prevCount) {
      this.saveEmployees();
      if (this.currentProfile.id === id) {
        this.currentProfile = this.employees[0] || DEFAULT_EMPLOYEES[0];
        localStorage.setItem("protech_user_profile", JSON.stringify(this.currentProfile));
      }
      if (this.isCloudConnected && isSupabaseConfigured) {
        try {
          await supabase.from("attendance_employees").delete().eq("id", id);
        } catch (e) {}
      }
      this.notifyListeners();
      return true;
    }
    return false;
  }

  getActiveEmployee(): UserProfile | null {
    return this.currentProfile;
  }

  setActiveEmployee(id: string): UserProfile | null {
    const found = this.employees.find((e) => e.id === id);
    if (found) {
      this.currentProfile = found;
      localStorage.setItem("protech_user_profile", JSON.stringify(found));
      return found;
    }
    return null;
  }

  // --- SETTINGS ---

  async getSettings(): Promise<SystemSettings> {
    return this.settings;
  }

  async updateSettings(newSettings: Partial<SystemSettings>): Promise<{ success: boolean; settings: SystemSettings; error?: string }> {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem("attendance_settings", JSON.stringify(this.settings));
      return { success: true, settings: this.settings };
    } catch (e: any) {
      return { success: false, settings: this.settings, error: e?.message };
    }
  }

  // --- ATTENDANCE ACTIONS (REALTIME & PERSISTENT) ---

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
    const today = params.customDate || (params.customTime ? getLocalDateString(new Date(params.customTime)) : getTodayDateString());
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

    // Immediate local insertion
    this.records.unshift(newRecord);
    this.saveRecords();

    // Broadcast to Supabase Cloud Database (Instantly syncs to ALL devices)
    if (this.isCloudConnected && isSupabaseConfigured) {
      try {
        const { error } = await supabase.from("attendance_records").upsert({
          id: newRecord.id,
          user_id: newRecord.user_id,
          date: newRecord.date,
          check_in_time: newRecord.check_in_time,
          check_out_time: null,
          work_type: newRecord.work_type,
          status: newRecord.status,
          check_in_note: newRecord.check_in_note,
          location: newRecord.location,
          user_name: emp.full_name,
          department: emp.department,
        });
        if (error) {
          console.error("Supabase cloud checkIn error:", error);
        } else {
          console.log("☁️ Record saved and broadcasted to Supabase Realtime!");
        }
      } catch (e) {
        console.error("Supabase upsert failed:", e);
      }
    }

    sendCheckInNotification(newRecord, emp, settings).catch(console.error);
    this.notifyListeners();

    return { record: newRecord };
  }

  async checkOut(params: {
    recordId: string;
    note?: string;
    customTime?: string;
  }): Promise<{ record: AttendanceRecord | null; error?: string }> {
    const now = params.customTime ? new Date(params.customTime) : new Date();
    const idx = this.records.findIndex((r) => r.id === params.recordId);
    if (idx === -1) return { record: null, error: "Record not found" };

    this.records[idx] = {
      ...this.records[idx],
      check_out_time: now.toISOString(),
      check_out_note: params.note || "",
    };
    this.saveRecords();

    if (this.isCloudConnected && isSupabaseConfigured) {
      try {
        await supabase
          .from("attendance_records")
          .update({
            check_out_time: this.records[idx].check_out_time,
            check_out_note: this.records[idx].check_out_note,
          })
          .eq("id", params.recordId);
      } catch (e) {
        console.error("Cloud checkOut error:", e);
      }
    }

    this.notifyListeners();
    return { record: this.records[idx] };
  }

  async deleteRecord(recordId: string): Promise<boolean> {
    const prevCount = this.records.length;
    this.records = this.records.filter((r) => r.id !== recordId);
    if (this.records.length !== prevCount) {
      this.saveRecords();

      if (this.isCloudConnected && isSupabaseConfigured) {
        try {
          await supabase.from("attendance_records").delete().eq("id", recordId);
          console.log("☁️ Record deleted from cloud:", recordId);
        } catch (e) {
          console.error("Cloud delete error:", e);
        }
      }

      this.notifyListeners();
      return true;
    }
    return false;
  }

  async addManualRecord(params: {
    userId: string;
    date: string;
    checkInTime: string; // HH:mm
    workType: WorkType;
    status: AttendanceStatus;
    note?: string;
    location?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const existingIndex = this.records.findIndex((r) => r.user_id === params.userId && r.date === params.date);
    const checkInIso = params.date + "T" + params.checkInTime + ":00+07:00";
    const emp = this.employees.find((e) => e.id === params.userId) || this.currentProfile;

    const newRecord: AttendanceRecord = {
      id: existingIndex !== -1 ? this.records[existingIndex].id : "man-" + Date.now(),
      user_id: params.userId,
      date: params.date,
      check_in_time: checkInIso,
      check_out_time: null,
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

    if (this.isCloudConnected && isSupabaseConfigured) {
      try {
        await supabase.from("attendance_records").upsert({
          id: newRecord.id,
          user_id: newRecord.user_id,
          date: newRecord.date,
          check_in_time: newRecord.check_in_time,
          check_out_time: null,
          work_type: newRecord.work_type,
          status: newRecord.status,
          check_in_note: newRecord.check_in_note,
          location: newRecord.location,
          user_name: emp.full_name,
          department: emp.department,
        });
      } catch (e) {
        console.error("Cloud manual record save error:", e);
      }
    }

    this.notifyListeners();
    return { success: true };
  }

  async getUserHistory(userId: string): Promise<AttendanceRecord[]> {
    return this.records
      .filter((r) => r.user_id === userId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  async getTodayTeamAttendance(): Promise<{ records: AttendanceRecord[]; summary: any }> {
    const today = getTodayDateString();
    const records = this.records.filter((r) => r.date === today);
    const totalStaff = this.employees.length;
    const checkedIn = records.length;
    const onTime = records.filter((r) => r.status === 'on_time').length;
    const late = records.filter((r) => r.status === 'late').length;
    const checkedOut = records.filter((r) => !!r.check_out_time).length;
    return {
      records,
      summary: {
        totalStaff,
        checkedIn,
        onTime,
        late,
        checkedOut,
        onTimeRate: checkedIn > 0 ? Math.round((onTime / checkedIn) * 100) : 0,
      },
    };
  }

  subscribeToAttendance(callback: (newRecord: any) => void): () => void {
    return this.subscribeToUpdates(() => {
      if (this.records.length > 0) callback(this.records[0]);
    });
  }

  async getMember30DayAttendance(memberId: string): Promise<any> {
    const days: any[] = [];
    const now = new Date();
    const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
    let onTimeDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    let wfhDays = 0;
    let officeDays = 0;
    let onsiteDays = 0;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = getLocalDateString(d);
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = i === 0;
      const rec = this.records.find((r) => r.user_id === memberId && r.date === dateStr);

      let status: any = isWeekend ? "weekend" : "absent";
      if (rec) {
        status = rec.status === "on_time" ? "on_time" : "late";
        if (rec.status === "on_time") onTimeDays++;
        else lateDays++;
        if (rec.work_type === "office") officeDays++;
        else if (rec.work_type === "wfh") wfhDays++;
        else if (rec.work_type === "onsite") onsiteDays++;
      } else if (!isWeekend) {
        absentDays++;
      }

      days.push({
        date: dateStr,
        dayOfWeek,
        dayName: dayNames[dayOfWeek],
        formattedDate: `${d.getDate()}/${d.getMonth() + 1}`,
        isWeekend,
        isToday,
        record: rec,
        status,
      });
    }

    return {
      days,
      stats: {
        totalWorkDays: onTimeDays + lateDays + absentDays,
        onTimeDays,
        lateDays,
        absentDays,
        wfhDays,
        officeDays,
        onsiteDays,
      },
    };
  }

  // --- CALENDAR & STATS ---

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

    const attendanceRate = totalWorkDays > 0 ? Math.round((attendedDays / totalWorkDays) * 100) : 0;
    const onTimeRate = attendedDays > 0 ? Math.round((onTimeDays / attendedDays) * 100) : 0;

    const stats: MonthlyStats = {
      totalWorkDays,
      attendedDays,
      onTimeDays,
      lateDays,
      absentDays,
      attendanceRate,
      onTimeRate,
      wfhDays,
      officeDays,
      onsiteDays,
      totalHours: attendedDays * 8,
    };

    return { days, stats };
  }

  async getAllEmployeesTodayStatus(): Promise<
    Array<{
      employee: UserProfile;
      record: AttendanceRecord | null;
      statusText: string;
    }>
  > {
    const today = getTodayDateString();
    return this.employees.map((employee) => {
      const rec = this.records.find((r) => r.user_id === employee.id && r.date === today) || null;
      let statusText = "ยังไม่ลงเวลา";
      if (rec) {
        const t = new Date(rec.check_in_time).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        });
        statusText = `เข้างาน ${t} น. (${rec.status === "on_time" ? "ตรงเวลา" : "สาย"})`;
      }
      return {
        employee,
        record: rec,
        statusText,
      };
    });
  }
}

export const attendanceService = new AttendanceService();
