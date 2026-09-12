import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Calendar,
  CheckCircle2,
  Building2,
  Home,
  Briefcase,
  MapPin,
  UserPlus,
  Users,
  Camera,
  RotateCcw
} from 'lucide-react';
import type { AttendanceRecord, SystemSettings, UserProfile, WorkType } from '../types/attendance';
import { attendanceService, getLocalDateString } from '../services/attendanceService';
import { SuccessCelebrationModal } from './SuccessCelebrationModal';

interface QuickClockInOutProps {
  employees: UserProfile[];
  activeEmployee: UserProfile;
  settings: SystemSettings;
  onSelectEmployee: (emp: UserProfile) => void;
  onOpenAddEmployee: () => void;
  onViewCalendar: (emp: UserProfile) => void;
  onRecordUpdated: () => void;
}

export const QuickClockInOut: React.FC<QuickClockInOutProps> = ({
  employees,
  activeEmployee,
  settings,
  onSelectEmployee,
  onOpenAddEmployee,
  onViewCalendar,
  onRecordUpdated,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [teamStatus, setTeamStatus] = useState<Array<{ employee: UserProfile; record: AttendanceRecord | null; statusText: string }>>([]);
  const [workType, setWorkType] = useState<WorkType>('office');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('พิกัดอัตโนมัติ (สำนักงาน / ไซต์งาน)');
  const [loadingAction, setLoadingAction] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Celebration Modal State
  const [celebration, setCelebration] = useState<{
    isOpen: boolean;
    type: 'check_in';
    record: AttendanceRecord | null;
  }>({
    isOpen: false,
    type: 'check_in',
    record: null,
  });

  // Photo upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Time Selection for Clock-In (Easy selection / Forgot to clock in)
  const [timeMode, setTimeMode] = useState<'current' | 'custom'>('current');
  const [customDate, setCustomDate] = useState(() => getLocalDateString());
  const [customTime, setCustomTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  // Quick preset helper for Clock In relative minutes
  const applyRelativeMinutes = (minsAgo: number) => {
    const d = new Date(Date.now() - minsAgo * 60 * 1000);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    setCustomTime(`${h}:${m}`);
  };

  // Live timer & auto-detect midnight date reset (00:00)
  const lastDateRef = useRef(getLocalDateString());
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const currentDateStr = getLocalDateString(now);
      if (currentDateStr !== lastDateRef.current) {
        lastDateRef.current = currentDateStr;
        setCustomDate(currentDateStr);
        reloadData();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeEmployee.id]);

  // Load record for active employee and team overview
  const reloadData = async () => {
    if (!activeEmployee) return;
    const [rec, team] = await Promise.all([
      attendanceService.getTodayAttendance(activeEmployee.id),
      attendanceService.getAllEmployeesTodayStatus(),
    ]);
    setTodayRecord(rec);
    setTeamStatus(team);
  };

  useEffect(() => {
    reloadData();
  }, [activeEmployee.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          attendanceService.updateEmployeePhoto(activeEmployee.id, compressedDataUrl);
          showToast(`อัปเดตรูปถ่ายของ "${activeEmployee.full_name}" สำเร็จ`);
          onRecordUpdated();
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClockIn = async () => {
    setLoadingAction(true);
    try {
      let customTimestamp: string | undefined = undefined;
      if (timeMode === 'custom') {
        const [hours, mins] = customTime.split(':').map(Number);
        const targetDate = new Date(customDate);
        targetDate.setHours(hours || 8, mins || 30, 0, 0);
        customTimestamp = targetDate.toISOString();
      }

      const res = await attendanceService.checkIn({
        userId: activeEmployee.id,
        workType,
        note: note.trim(),
        location,
        customTime: customTimestamp,
        customDate: timeMode === 'custom' ? customDate : undefined,
      });

      if (res.error) {
        showToast(res.error);
      } else {
        showToast(`บันทึกเวลาเข้างานสำเร็จสำหรับ "${activeEmployee.full_name}"`);
        setNote('');
        await reloadData();
        onRecordUpdated();
        if (res.record) {
          setCelebration({
            isOpen: true,
            type: 'check_in',
            record: res.record,
          });
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'เกิดข้อผิดพลาดในการลงเวลา');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleResetRecord = async (recordId: string) => {
    if (!window.confirm('ต้องการยกเลิกการลงเวลาเข้างานของวันนี้ เพื่อลงเวลาใหม่หรือไม่?')) return;
    attendanceService.deleteRecord(recordId);
    showToast('ยกเลิกรายการเรียบร้อย สามารถลงเวลาเข้างานใหม่ได้แล้วครับ');
    await reloadData();
    onRecordUpdated();
  };

  const formattedDateThai = currentTime.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTimeThai = currentTime.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const isTodayClockedIn = !!todayRecord;

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Multi-Person Quick Selector (Horizontal swipe on mobile, grid on desktop) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-800">
              เลือกพนักงาน ({employees.length} คน)
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenAddEmployee}
            className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg transition cursor-pointer active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ เพิ่มคน</span>
          </button>
        </div>

        {/* Responsive: Swipeable Carousel on mobile, 4-col Grid on sm+ */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 -mx-1 px-1 sm:grid sm:grid-cols-4 sm:overflow-visible no-scrollbar snap-x">
          {employees.map((emp) => {
            const isSelected = emp.id === activeEmployee.id;
            const empStatus = teamStatus.find((t) => t.employee.id === emp.id);
            const isCheckedIn = !!empStatus?.record;

            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => onSelectEmployee(emp)}
                className={`flex items-center gap-2 sm:gap-2.5 p-2 sm:p-2.5 rounded-xl border text-left transition cursor-pointer min-w-[140px] sm:min-w-0 flex-shrink-0 snap-start active:scale-95 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/80 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden flex-shrink-0 bg-white border border-slate-200 shadow-xs">
                  <img
                    src={emp.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.full_name}`}
                    alt={emp.full_name}
                    className="w-full h-full object-cover"
                  />
                  {isCheckedIn && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                    {emp.full_name}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">{emp.department}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Clock In Action Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-7 shadow-xs relative overflow-hidden">
        {/* Background decorative tint */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        {/* Selected Person Header & Live Clock (Compact mobile 1-row layout) */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar with Camera Button */}
            <div className="relative group flex-shrink-0">
              <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-blue-600/20 bg-white p-0.5 shadow-sm">
                <img
                  src={activeEmployee.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${activeEmployee.full_name}`}
                  alt={activeEmployee.full_name}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="เปลี่ยนหรืออัปโหลดรูปถ่าย"
                className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white p-1 sm:p-1.5 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center border-2 border-white"
              >
                <Camera className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h1 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                  {activeEmployee.full_name}
                </h1>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200 flex-shrink-0">
                  {activeEmployee.department}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
                <span className="truncate">{formattedDateThai}</span>
              </p>
            </div>
          </div>

          {/* Live Digital Clock Card */}
          <div className="flex items-center gap-2 bg-slate-900 text-white px-3 sm:px-5 py-2 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-md flex-shrink-0">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <div className="text-base sm:text-2xl font-black font-mono tracking-tight text-white leading-tight">
                {formattedTimeThai}
              </div>
              <div className="text-[9px] sm:text-[11px] text-slate-400 font-medium text-right hidden sm:block">
                เริ่มงาน: {settings.work_start_time || '08:30'} น.
              </div>
            </div>
          </div>
        </div>

        {/* 3. Action Section (Clock In ONLY, No Clock Out) */}
        <div className="pt-6 space-y-5">
          {!isTodayClockedIn ? (
            /* STATE A: NOT CLOCKED IN YET -> Prominent Clock In Button at the VERY TOP */
            <div className="space-y-5">
              {/* PRIMARY CLOCK-IN BUTTON AT THE TOP */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-xs font-bold text-emerald-900">
                      พร้อมบันทึกเวลาเข้างานสำหรับ: <strong className="underline underline-offset-2">{activeEmployee.full_name}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-800 bg-white/90 px-3 py-1 rounded-xl border border-emerald-200 font-mono self-start sm:self-auto">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {timeMode === 'custom' ? `เวลาที่เลือก: ${customTime} น.` : `เวลาปัจจุบัน: ${formattedTimeThai}`}
                    </span>
                  </div>
                </div>

                {/* Instant 1-Click Clock In Button */}
                <button
                  type="button"
                  disabled={loadingAction}
                  onClick={handleClockIn}
                  className="w-full py-4 sm:py-5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base sm:text-lg shadow-lg shadow-emerald-600/25 transition duration-150 transform active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span>
                    {loadingAction
                      ? 'กำลังบันทึกเวลาเข้างาน...'
                      : timeMode === 'custom'
                      ? `ลงเวลาเข้างานย้อนหลัง (${customTime} น.)`
                      : `ลงเวลาเข้างานทันที (${activeEmployee.full_name})`}
                  </span>
                </button>
              </div>

              {/* Work Type Tabs (รูปแบบการปฏิบัติงาน) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  สถานที่ / รูปแบบการปฏิบัติงานวันนี้
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setWorkType('office')}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border text-center transition cursor-pointer active:scale-95 ${
                      workType === 'office'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <Building2 className={`w-4 h-4 sm:w-5 sm:h-5 mb-1 ${workType === 'office' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold">ออฟฟิศ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkType('wfh')}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border text-center transition cursor-pointer active:scale-95 ${
                      workType === 'wfh'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-bold shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <Home className={`w-4 h-4 sm:w-5 sm:h-5 mb-1 ${workType === 'wfh' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold">WFH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkType('onsite')}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border text-center transition cursor-pointer active:scale-95 ${
                      workType === 'onsite'
                        ? 'border-amber-600 bg-amber-50/80 text-amber-900 font-bold shadow-xs ring-1 ring-amber-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <Briefcase className={`w-4 h-4 sm:w-5 sm:h-5 mb-1 ${workType === 'onsite' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-semibold">ไซต์งาน</span>
                  </button>
                </div>
              </div>

              {/* Easy Time Selector (เวลาบันทึก - ปัจจุบัน หรือ ระบุเวลาย้อนหลัง) */}
              <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                    <span>เวลาบันทึกเข้างาน</span>
                  </span>

                  {/* Mode Selector Toggle */}
                  <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTimeMode('current')}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
                        timeMode === 'current'
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="hidden sm:inline">⚡ เวลาปัจจุบัน</span>
                      <span className="sm:hidden">⚡ ปัจจุบัน</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeMode('custom')}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
                        timeMode === 'custom'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span className="hidden sm:inline">🕒 ระบุเวลาย้อนหลัง</span>
                      <span className="sm:hidden">🕒 ย้อนหลัง</span>
                    </button>
                  </div>
                </div>

                {timeMode === 'current' ? (
                  <div className="flex items-center justify-between text-xs text-slate-600 bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 shadow-2xs">
                    <span>บันทึกตามเวลาจริงอัตโนมัติ:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{formattedTimeThai} น.</span>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1 animate-in fade-in duration-150">
                    {/* Date and Time Inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          วันที่เข้างาน
                        </label>
                        <input
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          เวลาเข้างานจริง (ระบุเวลา)
                        </label>
                        <input
                          type="time"
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                          className="w-full px-3 py-2 text-sm font-black font-mono text-blue-700 bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                    </div>

                    {/* Quick 1-Click Time Preset Chips */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 mb-1.5 block">
                        กดเลือกเวลาด่วน (1 วินาที):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCustomTime(settings.work_start_time || '08:30')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs transition cursor-pointer"
                        >
                          ⏰ {settings.work_start_time || '08:30'} (เวลาเริ่มงาน)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomTime('08:45')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
                        >
                          08:45
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomTime('09:00')}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
                        >
                          09:00
                        </button>
                        <button
                          type="button"
                          onClick={() => applyRelativeMinutes(15)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
                        >
                          ⏪ 15 นาทีก่อน
                        </button>
                        <button
                          type="button"
                          onClick={() => applyRelativeMinutes(30)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
                        >
                          ⏪ 30 นาทีก่อน
                        </button>
                        <button
                          type="button"
                          onClick={() => applyRelativeMinutes(60)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition cursor-pointer"
                        >
                          ⏪ 1 ชม. ก่อน
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Note / Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    หมายเหตุเพิ่มเติม (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ซ่อมบำรุงเครื่องจักร, พบลูกค้า..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    สถานที่ระบุ
                  </label>
                  <div className="flex items-center gap-2 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="bg-transparent w-full focus:outline-none text-slate-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* STATE B: ALREADY CLOCKED IN TODAY -> Clean Status Display (No Clock Out Needed) */
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-base">
                        บันทึกเวลาเข้างานวันนี้เรียบร้อยแล้ว
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          todayRecord.status === 'on_time'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {todayRecord.status === 'on_time' ? '✓ ตรงเวลา' : '⚠ สาย'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-1.5">
                      <span>เข้างานเวลา:</span>
                      <strong className="text-slate-900 font-mono text-sm font-black">
                        {new Date(todayRecord.check_in_time).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        น.
                      </strong>
                      <span>• รูปแบบ:</span>
                      <span className="font-semibold text-slate-800">
                        {todayRecord.work_type === 'office'
                          ? '🏢 ออฟฟิศ'
                          : todayRecord.work_type === 'wfh'
                          ? '🏠 WFH'
                          : '🚗 ไซต์งาน'}
                      </span>
                      {todayRecord.check_in_note && (
                        <span>• หมายเหตุ: "{todayRecord.check_in_note}"</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                  <button
                    type="button"
                    onClick={() => handleResetRecord(todayRecord.id)}
                    className="py-2.5 px-4 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs"
                    title="กรณีลงเวลาผิด หรือต้องการเปลี่ยนเวลาเข้างาน"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>แก้ไข / ลงเวลาใหม่</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onViewCalendar(activeEmployee)}
                    className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>ดูปฏิทินของคนนี้</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Team Attendance Overview (Mobile Cards + Desktop Table, NO CLOCK-OUT) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              สถานะทีมงานวันนี้ ({teamStatus.filter((t) => t.record).length}/{employees.length} คนลงเวลาแล้ว)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">อัปเดตสด</span>
        </div>

        {/* Mobile View: Clean Touch Cards (sm:hidden) */}
        <div className="sm:hidden divide-y divide-slate-100">
          {teamStatus.map(({ employee, record }) => {
            const isSelected = employee.id === activeEmployee.id;
            const inTime = record
              ? new Date(record.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
              : null;
            const workTypeEmoji =
              record?.work_type === 'office' ? '🏢' : record?.work_type === 'wfh' ? '🏠' : record?.work_type === 'onsite' ? '🚗' : '';

            return (
              <div
                key={employee.id}
                className={`py-3 flex items-center justify-between gap-2.5 transition ${
                  isSelected ? 'bg-blue-50/50 -mx-2 px-2 rounded-xl' : ''
                }`}
              >
                {/* Avatar & Info */}
                <button
                  type="button"
                  onClick={() => onSelectEmployee(employee)}
                  className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer flex-1"
                >
                  <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-white border border-slate-200 shadow-xs">
                    <img
                      src={employee.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${employee.full_name}`}
                      alt={employee.full_name}
                      className="w-full h-full object-cover"
                    />
                    {record && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900 truncate">{employee.full_name}</p>
                      {isSelected && (
                        <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded font-semibold flex-shrink-0">
                          เลือกอยู่
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{employee.department}</p>
                  </div>
                </button>

                {/* Status & Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {record ? (
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          record.status === 'on_time'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <span>{workTypeEmoji}</span>
                        <span>{inTime} น.</span>
                      </span>
                      <span className="block text-[9px] text-slate-400 mt-0.5 text-right">
                        {record.status === 'on_time' ? '● ตรงเวลา' : '● สาย'}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectEmployee(employee)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-700 text-[11px] font-bold transition cursor-pointer border border-blue-200/60"
                    >
                      ลงเวลาคนนี้
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onViewCalendar(employee)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-slate-100 active:scale-95 transition cursor-pointer"
                    title="ดูปฏิทินรายเดือน"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop/Tablet View: Full Table (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-semibold border-b border-slate-100">
                <th className="pb-2.5 font-medium">พนักงาน</th>
                <th className="pb-2.5 font-medium">แผนก</th>
                <th className="pb-2.5 font-medium">เวลาเข้างาน</th>
                <th className="pb-2.5 font-medium">สถานที่/รูปแบบ</th>
                <th className="pb-2.5 font-medium">สถานะ</th>
                <th className="pb-2.5 font-medium text-right">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamStatus.map(({ employee, record }) => {
                const isSelected = employee.id === activeEmployee.id;
                const inTime = record
                  ? new Date(record.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                  : '-';
                const workTypeLabel = record
                  ? record.work_type === 'office'
                    ? '🏢 ออฟฟิศ'
                    : record.work_type === 'wfh'
                    ? '🏠 WFH'
                    : '🚗 ไซต์งาน'
                  : '-';

                return (
                  <tr
                    key={employee.id}
                    className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-blue-50/40' : ''}`}
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={employee.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${employee.full_name}`}
                          alt={employee.full_name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200"
                        />
                        <span className="font-semibold text-slate-900">{employee.full_name}</span>
                        {isSelected && (
                          <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-medium">
                            เลือกอยู่
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">{employee.department}</td>
                    <td className="py-3 font-mono font-bold text-slate-800">{inTime} {record ? 'น.' : ''}</td>
                    <td className="py-3 text-slate-600">{workTypeLabel}</td>
                    <td className="py-3">
                      {record ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            record.status === 'on_time'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {record.status === 'on_time' ? '● ตรงเวลา' : '● สาย'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                          ○ ยังไม่ลงเวลา
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectEmployee(employee)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium transition cursor-pointer"
                        >
                          {record ? 'เลือกดู' : 'ลงเวลาคนนี้'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onViewCalendar(employee)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                          title="ดูปฏิทินรายเดือน"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Sticky Floating Action Bar (Always visible floating bar on mobile & desktop) */}
      <aside
        aria-label="แถบลงเวลาเข้างานลอยตัว"
        className="fixed bottom-3 sm:bottom-4 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-xl z-40 bg-slate-900/95 backdrop-blur-md text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-2 sm:gap-3 animate-in slide-in-from-bottom-4 duration-200 mb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden flex-shrink-0 border border-slate-600 bg-slate-800">
            <img
              src={activeEmployee.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${activeEmployee.full_name}`}
              alt={activeEmployee.full_name}
              className="w-full h-full object-cover"
            />
            {todayRecord && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold truncate text-white max-w-[105px] xs:max-w-[140px] sm:max-w-[170px]">
                {activeEmployee.full_name}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono hidden sm:inline-block">
                {workType === 'office' ? 'ออฟฟิศ' : workType === 'wfh' ? 'WFH' : 'ไซต์งาน'}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              {todayRecord ? (
                <span className="text-emerald-300 font-semibold truncate">
                  เข้าแล้ว: {new Date(todayRecord.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                </span>
              ) : timeMode === 'custom' ? (
                <span>ระบุ: {customTime} น.</span>
              ) : (
                <span>{formattedTimeThai} น.</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {todayRecord ? (
            <button
              type="button"
              onClick={() => handleResetRecord(todayRecord.id)}
              className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="แก้ไขหรือลงเวลาเข้างานใหม่"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>แก้ไขเวลา</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={loadingAction}
              onClick={handleClockIn}
              className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-500/30 transition flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{loadingAction ? 'บันทึก...' : 'ลงเวลาทันที'}</span>
            </button>
          )}
        </div>
      </aside>

      {/* Pop-up Celebration Animation Modal */}
      <SuccessCelebrationModal
        isOpen={celebration.isOpen}
        onClose={() => setCelebration((prev) => ({ ...prev, isOpen: false }))}
        type={celebration.type}
        employee={activeEmployee}
        record={celebration.record}
      />
    </div>
  );
};
