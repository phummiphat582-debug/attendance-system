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
  LogOut,
  Timer,
  Users,
  Camera,
  Upload
} from 'lucide-react';
import type { AttendanceRecord, SystemSettings, UserProfile, WorkType } from '../types/attendance';
import { attendanceService } from '../services/attendanceService';
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
    type: 'check_in' | 'check_out';
    record: AttendanceRecord | null;
  }>({
    isOpen: false,
    type: 'check_in',
    record: null,
  });

  // Photo upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check-out note state
  const [checkOutNote, setCheckOutNote] = useState('');
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);

  // Live timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      const res = await attendanceService.checkIn({
        userId: activeEmployee.id,
        workType,
        note: note.trim(),
        location,
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

  const handleClockOut = async () => {
    if (!todayRecord) return;
    setLoadingAction(true);
    try {
      const res = await attendanceService.checkOut({
        recordId: todayRecord.id,
        note: checkOutNote.trim(),
      });

      if (res.error) {
        showToast(res.error);
      } else {
        setShowCheckOutModal(false);
        setCheckOutNote('');
        showToast(`บันทึกเวลาออกงานเรียบร้อย (${activeEmployee.full_name})`);
        await reloadData();
        onRecordUpdated();
        if (res.record) {
          setCelebration({
            isOpen: true,
            type: 'check_out',
            record: res.record,
          });
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'เกิดข้อผิดพลาดในการออกงาน');
    } finally {
      setLoadingAction(false);
    }
  };

  // Calculate elapsed time if checked in
  const getElapsedTimeString = () => {
    if (!todayRecord || !todayRecord.check_in_time) return '';
    const inTime = new Date(todayRecord.check_in_time).getTime();
    const endTime = todayRecord.check_out_time ? new Date(todayRecord.check_out_time).getTime() : currentTime.getTime();
    const diffMin = Math.max(0, Math.floor((endTime - inTime) / (1000 * 60)));
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `${hours} ชม. ${mins} นาที`;
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

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Multi-Person Quick Selector Carousel */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">
              เลือกพนักงานที่ต้องการลงเวลา ({employees.length} คน)
            </h2>
          </div>
          <button
            type="button"
            onClick={onOpenAddEmployee}
            className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ เพิ่มพนักงาน</span>
          </button>
        </div>

        {/* Employee Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {employees.map((emp) => {
            const isSelected = emp.id === activeEmployee.id;
            const empStatus = teamStatus.find((t) => t.employee.id === emp.id);
            const isCheckedIn = !!empStatus?.record;
            const isCheckedOut = !!empStatus?.record?.check_out_time;

            return (
              <button
                key={emp.id}
                type="button"
                onClick={() => onSelectEmployee(emp)}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-white border border-slate-200 shadow-xs">
                  <img
                    src={emp.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${emp.full_name}`}
                    alt={emp.full_name}
                    className="w-full h-full object-cover"
                  />
                  {isCheckedIn && (
                    <span
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        isCheckedOut ? 'bg-slate-400' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold truncate ${isSelected ? 'text-blue-950' : 'text-slate-800'}`}>
                    {emp.full_name}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">{emp.department}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Clock In / Clock Out Action Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        {/* Background decorative tint */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        {/* Selected Person Header & Live Clock */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            {/* Avatar with Camera Button & Hidden Input */}
            <div className="relative group flex-shrink-0">
              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden border-2 border-blue-600/20 bg-white p-0.5 shadow-sm">
                <img
                  src={activeEmployee.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${activeEmployee.full_name}`}
                  alt={activeEmployee.full_name}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="เปลี่ยนหรืออัปโหลดรูปถ่ายเจ้าหน้าที่"
                className="absolute -bottom-1 -right-1 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white p-1.5 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center border-2 border-white"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {activeEmployee.full_name}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                  {activeEmployee.department}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-800 bg-blue-50/90 hover:bg-blue-100 px-2.5 py-0.5 rounded-md font-medium transition cursor-pointer border border-blue-200/60"
                  title="อัปโหลดรูปใหม่จากคอมหรือมือถือ"
                >
                  <Upload className="w-3 h-3" />
                  <span>เปลี่ยนรูปถ่าย</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formattedDateThai}</span>
              </p>
            </div>
          </div>

          {/* Large Live Digital Clock */}
          <div className="flex items-baseline gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-md">
            <Clock className="w-5 h-5 text-blue-400 self-center" />
            <div>
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                {formattedTimeThai}
              </div>
              <div className="text-[11px] text-slate-400 font-medium text-right">
                เวลาเริ่มงาน: {settings.work_start_time || '08:30'} น.
              </div>
            </div>
          </div>
        </div>

        {/* 3. Action Section depending on status */}
        <div className="pt-6">
          {!todayRecord ? (
            /* STATE A: Not checked in yet */
            <div className="space-y-6">
              {/* Work Type Tabs */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  สถานที่ / รูปแบบการปฏิบัติงานวันนี้
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setWorkType('office')}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border text-center transition cursor-pointer ${
                      workType === 'office'
                        ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-xs ring-1 ring-blue-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <Building2 className={`w-5 h-5 mb-1 ${workType === 'office' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="text-xs">เข้าออฟฟิศ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkType('wfh')}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border text-center transition cursor-pointer ${
                      workType === 'wfh'
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-bold shadow-xs ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <Home className={`w-5 h-5 mb-1 ${workType === 'wfh' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="text-xs">WFH (ที่บ้าน)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkType('onsite')}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border text-center transition cursor-pointer ${
                      workType === 'onsite'
                        ? 'border-amber-600 bg-amber-50/80 text-amber-900 font-bold shadow-xs ring-1 ring-amber-500'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <Briefcase className={`w-5 h-5 mb-1 ${workType === 'onsite' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-xs">ไซต์งาน / นอกสถานที่</span>
                  </button>
                </div>
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

              {/* Instant 1-Click Clock In Button */}
              <button
                type="button"
                disabled={loadingAction}
                onClick={handleClockIn}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base sm:text-lg shadow-lg shadow-emerald-600/30 transition duration-150 transform active:scale-[0.99] flex items-center justify-center gap-3 cursor-pointer"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span>
                  {loadingAction ? 'กำลังบันทึกเวลา...' : `ลงเวลาเข้างานทันที (${activeEmployee.full_name})`}
                </span>
              </button>
            </div>
          ) : !todayRecord.check_out_time ? (
            /* STATE B: Clocked in, ready to clock out */
            <div className="space-y-6">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">บันทึกเวลาเข้างานแล้ว</span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                          todayRecord.status === 'on_time'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {todayRecord.status === 'on_time' ? '✓ ตรงเวลา' : '⚠ สาย'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      เข้างานเวลา:{' '}
                      <strong className="text-slate-900 font-mono text-sm">
                        {new Date(todayRecord.check_in_time).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        น.
                      </strong>{' '}
                      • รูปแบบ: {todayRecord.work_type === 'office' ? 'ออฟฟิศ' : todayRecord.work_type === 'wfh' ? 'WFH' : 'ไซต์งาน'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-emerald-200 text-xs text-slate-700 font-medium">
                  <Timer className="w-4 h-4 text-emerald-600" />
                  <span>ระยะเวลาทำงาน: <strong>{getElapsedTimeString()}</strong></span>
                </div>
              </div>

              {/* Clock Out Trigger */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setShowCheckOutModal(true)}
                  className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm sm:text-base shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span>ลงเวลาออกงาน (Clock Out)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onViewCalendar(activeEmployee)}
                  className="py-3.5 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span>ดูปฏิทินรายเดือนของคนนี้</span>
                </button>
              </div>
            </div>
          ) : (
            /* STATE C: Already clocked in and clocked out today */
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  เสร็จสิ้นการลงเวลาวันนี้แล้ว ({activeEmployee.full_name})
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  เข้างาน:{' '}
                  <strong>
                    {new Date(todayRecord.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                  </strong>{' '}
                  • ออกงาน:{' '}
                  <strong>
                    {new Date(todayRecord.check_out_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                  </strong>{' '}
                  • รวมเวลาปฏิบัติงาน: <strong>{getElapsedTimeString()}</strong>
                </p>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onViewCalendar(activeEmployee)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>เปิดดูปฏิทินของ {activeEmployee.full_name}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Team Attendance Overview Table (Multi-person Quick Action) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              สถานะการลงเวลาของทีมงานวันนี้ ({teamStatus.filter(t => t.record).length}/{employees.length} คนเข้างานแล้ว)
            </h3>
          </div>
          <span className="text-xs text-slate-400">อัปเดตเรียลไทม์</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-semibold border-b border-slate-100">
                <th className="pb-2.5 font-medium">พนักงาน</th>
                <th className="pb-2.5 font-medium">แผนก</th>
                <th className="pb-2.5 font-medium">เวลาเข้า</th>
                <th className="pb-2.5 font-medium">เวลาออก</th>
                <th className="pb-2.5 font-medium">สถานะ</th>
                <th className="pb-2.5 font-medium text-right">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teamStatus.map(({ employee, record }) => {
                const isSelected = employee.id === activeEmployee.id;
                const inTime = record ? new Date(record.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';
                const outTime = record?.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-';

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
                    <td className="py-3 font-mono text-slate-700">{inTime}</td>
                    <td className="py-3 font-mono text-slate-700">{outTime}</td>
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
                          {record ? 'จัดการ' : 'ลงเวลาคนนี้'}
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

      {/* Check Out Modal */}
      {showCheckOutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900">
              ยืนยันการลงเวลาออกงาน ({activeEmployee.full_name})
            </h3>
            <p className="text-xs text-slate-500">
              เวลาปัจจุบัน:{' '}
              <strong className="text-slate-900 font-mono">
                {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.
              </strong>
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สรุปงานวันนี้ / หมายเหตุการออกงาน (ไม่บังคับ)
              </label>
              <textarea
                rows={3}
                placeholder="ระบุความคืบหน้างานของวันนี้ หรือหมายเหตุ..."
                value={checkOutNote}
                onChange={(e) => setCheckOutNote(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowCheckOutModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={loadingAction}
                onClick={handleClockOut}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-sm cursor-pointer"
              >
                {loadingAction ? 'กำลังบันทึก...' : 'ยืนยันออกงาน'}
              </button>
            </div>
          </div>
        </div>
      )}

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
