import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { AttendanceRecord, SystemSettings, UserProfile, WorkType } from '../types/attendance';
import { attendanceService } from '../services/attendanceService';
import { LogOut, Loader2, CheckCircle2, User, Edit3, X, Check } from 'lucide-react';

interface EmployeeDashboardProps {
  currentUser: UserProfile;
  settings: SystemSettings;
  onCheckInSuccess?: () => void;
  onProfileUpdated?: (updated: UserProfile) => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  currentUser,
  settings,
  onCheckInSuccess,
  onProfileUpdated,
}) => {
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Form states
  const [workType, setWorkType] = useState<WorkType>('office');
  const [note, setNote] = useState('');
  const [location, setLocation] = useState('กำลังระบุพิกัด...');
  const [locating, setLocating] = useState(false);

  // Check-out modal
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [checkOutNote, setCheckOutNote] = useState('');

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser.full_name || '');
  const [editDept, setEditDept] = useState(currentUser.department || '');

  // Toast Notice
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      const [record, history] = await Promise.all([
        attendanceService.getTodayAttendance(currentUser.id),
        attendanceService.getUserHistory(currentUser.id),
      ]);
      setTodayRecord(record);
      setHistoryRecords(history);
    } catch (err) {
      console.error('Error loading attendance data:', err);
    }
  };

  useEffect(() => {
    loadData();
    refreshGps();
  }, [currentUser.id]);

  const refreshGps = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      setLocation('ระบุตำแหน่งผ่านอินเทอร์เน็ต');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(`พิกัด GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        setLocating(false);
      },
      () => {
        setLocation('ไซต์งานประจำการ (อุปกรณ์ไม่ได้เปิด GPS)');
        setLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    const updated = await attendanceService.updateUserProfile({
      full_name: editName.trim(),
      department: editDept.trim() || 'ฝ่ายปฏิบัติการ',
    });
    if (onProfileUpdated) onProfileUpdated(updated);
    setIsEditingProfile(false);
    showToast('บันทึกข้อมูลพนักงานเรียบร้อย');
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      const result = await attendanceService.checkIn({
        userId: currentUser.id,
        workType,
        note: note.trim(),
        location,
      });

      if (result.error) {
        showToast(result.error);
      } else if (result.record) {
        setTodayRecord(result.record);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        const timeFormatted = new Date(result.record.check_in_time).toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        showToast(`บันทึกเวลาเข้างานสำเร็จ: ${timeFormatted} น.`);
        setNote('');
        await loadData();
        if (onCheckInSuccess) onCheckInSuccess();
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาดในการลงเวลา');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    setActionLoading(true);
    try {
      const result = await attendanceService.checkOut({
        recordId: todayRecord.id,
        note: checkOutNote.trim(),
      });

      if (result.error) {
        showToast(result.error);
      } else if (result.record) {
        setTodayRecord(result.record);
        setShowCheckOutModal(false);
        setCheckOutNote('');
        showToast('ลงเวลาออกงานเรียบร้อย ขอบคุณสำหรับการปฏิบัติงานวันนี้!');
        await loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setActionLoading(false);
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Calculate late status
  const [startHour, startMin] = (settings.work_start_time || '08:30').split(':').map(Number);
  const deadline = new Date();
  deadline.setHours(startHour, startMin + (settings.late_threshold_minutes || 15), 0, 0);
  const isCurrentlyLate = currentTime > deadline;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs sm:text-sm animate-in slide-in-from-bottom-5">
          <span className="material-symbols-outlined text-emerald-400 text-xl">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* EMPLOYEE PROFILE BAR (Editable by worker) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-base flex-shrink-0">
            {currentUser.full_name ? currentUser.full_name.charAt(0) : <User className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">ผู้ลงเวลา:</span>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {currentUser.full_name || 'ช่างเทคนิค'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentUser.department || 'ฝ่ายปฏิบัติการ'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditName(currentUser.full_name || '');
            setEditDept(currentUser.department || '');
            setIsEditingProfile(true);
          }}
          className="text-xs text-blue-700 hover:text-blue-900 font-semibold px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50/50 flex items-center gap-1.5 transition cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>เปลี่ยนชื่อ / แผนก</span>
        </button>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-700" />
                <span>ระบุข้อมูลพนักงานของคุณ</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อ - นามสกุล
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="เช่น สมเกียรติ ยั่งยืน"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  แผนก / ตำแหน่ง / รหัสพนักงาน
                </label>
                <input
                  type="text"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                  placeholder="เช่น ช่างไฟฟ้า • กะเช้า (TECH-01)"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-4 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-semibold hover:bg-blue-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>บันทึก</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HERO SECTION: FOCUSED 1-CLICK CLOCK-IN CARD */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          
          {/* LEFT COLUMN: REAL TIME & STATUS DISPLAY */}
          <div className="lg:col-span-5 p-6 sm:p-8 bg-gradient-to-b from-blue-50/60 via-slate-50/30 to-white flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  ระบบพร้อมบันทึกเวลา
                </span>
                <span className="text-xs font-medium text-slate-500">
                  กะเริ่ม {settings.work_start_time || '08:30'} น.
                </span>
              </div>

              {/* Big Digital Clock Display */}
              <div className="mt-4 text-center lg:text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-900/70">เวลาปัจจุบัน (UTC+7)</span>
                <div className="font-mono font-bold text-5xl sm:text-6xl text-slate-900 tracking-tight my-1">
                  {formattedTime}
                </div>
                <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-slate-600 font-medium">
                  <span className="material-symbols-outlined text-base text-blue-700">calendar_month</span>
                  <span>{formattedDate}</span>
                </div>
              </div>
            </div>

            {/* Status Indicator Card */}
            <div className="mt-8 pt-6 border-t border-slate-200/80">
              <div className="rounded-xl bg-white border border-slate-200/90 p-4 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-blue-100/70 text-blue-800 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-xl">timer</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-500">สถานะวันนี้</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {todayRecord
                      ? todayRecord.check_out_time
                        ? 'ลงเวลาออกงานแล้ว'
                        : `เข้างานแล้วเวลา ${new Date(todayRecord.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
                      : 'ยังไม่ได้ลงเวลาเข้างาน'}
                  </p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded border ${
                    todayRecord
                      ? todayRecord.status === 'on_time'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                      : isCurrentlyLate
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {todayRecord
                    ? todayRecord.status === 'on_time'
                      ? 'ตรงเวลา'
                      : 'สาย'
                    : isCurrentlyLate
                    ? 'เกินเวลา'
                    : 'รอสแตมป์'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: STREAMLINED CLOCK-IN FORM */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div>
              {/* Section Title */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-700">touch_app</span>
                  <span>บันทึกเวลาปฏิบัติงาน</span>
                </h2>
                <span className="text-xs text-slate-500">กดปุ่มเดียวจบ</span>
              </div>

              {/* 1. Select Work Type (3 Simple Choices) */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  1. เลือกรูปแบบการปฏิบัติงาน
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setWorkType('office')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all text-center cursor-pointer ${
                      workType === 'office'
                        ? 'border-2 border-blue-700 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl mb-1 ${workType === 'office' ? 'text-blue-700' : 'text-slate-500'}`}>
                      apartment
                    </span>
                    <span className={`text-xs ${workType === 'office' ? 'font-bold' : 'font-semibold'}`}>
                      ในไซต์งาน / โรงงาน
                    </span>
                    <span className="text-[11px] text-blue-600/80">พื้นที่หลักประจำการ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkType('wfh')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all text-center cursor-pointer ${
                      workType === 'wfh'
                        ? 'border-2 border-blue-700 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl mb-1 ${workType === 'wfh' ? 'text-blue-700' : 'text-slate-500'}`}>
                      computer
                    </span>
                    <span className={`text-xs ${workType === 'wfh' ? 'font-bold' : 'font-semibold'}`}>
                      WFH / งานเอกสาร
                    </span>
                    <span className="text-[11px] text-slate-400">งานระบบ / ออกแบบ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkType('onsite')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all text-center cursor-pointer ${
                      workType === 'onsite'
                        ? 'border-2 border-blue-700 bg-blue-50/70 text-blue-900 shadow-xs'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl mb-1 ${workType === 'onsite' ? 'text-blue-700' : 'text-slate-500'}`}>
                      directions_car
                    </span>
                    <span className={`text-xs ${workType === 'onsite' ? 'font-bold' : 'font-semibold'}`}>
                      งานนอกสถานที่
                    </span>
                    <span className="text-[11px] text-slate-400">พบลูกค้า / ตรวจหน้างาน</span>
                  </button>
                </div>
              </div>

              {/* 2. Note (Blank by default) */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>2. บันทึกงานประจำวัน (ถ้ามี)</span>
                  <span className="text-[11px] font-normal text-slate-400">ไม่บังคับ</span>
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="พิมพ์รายละเอียดงานประจำวันสั้นๆ..."
                  className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                />
                {/* General category chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'ปฏิบัติงานในไซต์ตามปกติ',
                    'งานซ่อมบำรุงประจำวัน',
                    'ตรวจเช็กระบบไฟฟ้า / เครื่องกล',
                    'ติดตั้งและส่งมอบงาน',
                    'เข้าพบลูกค้า / ตรวจหน้างาน',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setNote(chip)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-800 border border-slate-200 transition cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Real GPS Location Banner */}
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200/80 p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="material-symbols-outlined text-blue-700 text-lg flex-shrink-0">location_on</span>
                  <div className="truncate text-xs">
                    <span className="font-semibold text-slate-900">พิกัดสถานที่:</span>
                    <span className="text-slate-600 ml-1">{locating ? 'กำลังค้นหาดาวเทียม GPS...' : location}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={refreshGps}
                  className="text-xs text-blue-700 font-semibold hover:underline flex-shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-sm ${locating ? 'animate-spin' : ''}`}>refresh</span>
                  <span className="hidden sm:inline">ดึงพิกัดใหม่</span>
                </button>
              </div>
            </div>

            {/* 4. Action Button */}
            <div className="pt-2">
              {todayRecord ? (
                <div className="space-y-2">
                  <div className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 text-white font-bold text-base sm:text-lg tracking-wide shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      ✓ บันทึกเวลาเข้างานแล้ว ({new Date(todayRecord.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)
                    </span>
                  </div>

                  {!todayRecord.check_out_time && (
                    <button
                      type="button"
                      onClick={() => setShowCheckOutModal(true)}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>ลงเวลาออกงานเมื่อเสร็จสิ้นกะ (Clock Out)</span>
                    </button>
                  )}

                  {todayRecord.check_out_time && (
                    <div className="text-center text-xs text-slate-500 font-medium py-1">
                      บันทึกเวลาออกงานเรียบร้อย ({new Date(todayRecord.check_out_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="w-full py-3.5 px-6 rounded-xl bg-blue-900 hover:bg-blue-800 active:scale-[0.99] text-white font-bold text-base sm:text-lg tracking-wide shadow-md shadow-blue-950/10 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                  )}
                  <span>
                    {actionLoading ? 'กำลังบันทึก...' : 'บันทึกเวลาเข้างานทันที (Clock In)'}
                  </span>
                </button>
              )}

              <p className="text-center text-[11px] text-slate-400 mt-2">
                กดเพียงครั้งเดียว ระบบจะบันทึกเวลาจริงและแจ้งเตือนหัวหน้างานทันที
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 3 REAL SUMMARY CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Today Clock In */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-xl">login</span>
          </div>
          <div className="min-w-0">
            <span className="text-xs text-slate-500 font-medium">เวลาเข้างานวันนี้</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-base font-bold text-slate-900">
                {todayRecord
                  ? `${new Date(todayRecord.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.`
                  : 'ยังไม่ได้ลงเวลา'}
              </span>
              {todayRecord && (
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded font-semibold border ${
                    todayRecord.status === 'late'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {todayRecord.status === 'late' ? 'สาย' : 'ตรงเวลา'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Shift Specification */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-xl">schedule</span>
          </div>
          <div className="min-w-0">
            <span className="text-xs text-slate-500 font-medium">กะเวลาทำงาน</span>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              {settings.work_start_time || '08:30'} - 17:30 น.
            </p>
          </div>
        </div>

        {/* Card 3: Designated Site / Location */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-xl">pin_drop</span>
          </div>
          <div className="min-w-0">
            <span className="text-xs text-slate-500 font-medium">สถานที่บันทึก</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
              {todayRecord?.location || location}
            </p>
          </div>
        </div>
      </section>

      {/* REAL RECENT CHECK-IN HISTORY TABLE */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-700 text-xl">history</span>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">ประวัติการลงเวลาจริงของคุณ</h3>
          </div>
          <span className="text-xs text-slate-500">
            บันทึกแล้วทั้งหมด {historyRecords.length} รายการ
          </span>
        </div>

        {historyRecords.length === 0 ? (
          <div className="py-12 px-4 text-center text-slate-400 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">pending_actions</span>
            <p className="text-sm font-semibold text-slate-600">ยังไม่มีประวัติการลงเวลา</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              เมื่อคุณกดปุ่ม "บันทึกเวลาเข้างาน" ข้อมูลจริงจะถูกจัดเก็บและแสดงในตารางนี้ทันที
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70">
                  <th className="py-3 px-4 sm:px-6">วันที่</th>
                  <th className="py-3 px-4 sm:px-6">เวลาเข้างาน</th>
                  <th className="py-3 px-4 sm:px-6">เวลาออกงาน</th>
                  <th className="py-3 px-4 sm:px-6">รูปแบบงาน</th>
                  <th className="py-3 px-4 sm:px-6">บันทึกงาน</th>
                  <th className="py-3 px-4 sm:px-6 text-right">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
                {historyRecords.map((rec) => {
                  const checkInDate = new Date(rec.check_in_time);
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 sm:px-6 font-medium text-slate-900">
                        {checkInDate.toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 sm:px-6 font-mono font-semibold text-blue-900">
                        {checkInDate.toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })} น.
                      </td>
                      <td className="py-3 px-4 sm:px-6 font-mono text-slate-600">
                        {rec.check_out_time
                          ? `${new Date(rec.check_out_time).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })} น.`
                          : '-'}
                      </td>
                      <td className="py-3 px-4 sm:px-6">
                        <span className="inline-flex items-center gap-1 text-slate-700">
                          <span className="material-symbols-outlined text-sm text-blue-600">
                            {rec.work_type === 'office' ? 'apartment' : rec.work_type === 'wfh' ? 'computer' : 'directions_car'}
                          </span>
                          <span>
                            {rec.work_type === 'office' ? 'ในไซต์งาน' : rec.work_type === 'wfh' ? 'WFH' : 'นอกสถานที่'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 sm:px-6 text-slate-500 truncate max-w-xs">
                        {rec.check_in_note || '-'}
                      </td>
                      <td className="py-3 px-4 sm:px-6 text-right">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                            rec.status === 'on_time'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {rec.status === 'on_time' ? 'ตรงเวลา' : 'สาย'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Check Out Modal */}
      {showCheckOutModal && todayRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">ลงเวลาออกงาน (Clock Out)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckOutModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              บันทึกเวลาสิ้นสุดการปฏิบัติงานประจำวัน ข้อมูลจะถูกบันทึกและส่งรายงานสรุปไปยังหัวหน้างาน
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                สรุปผลงานที่ทำเสร็จในวันนี้ (ถ้ามี)
              </label>
              <textarea
                value={checkOutNote}
                onChange={(e) => setCheckOutNote(e.target.value)}
                placeholder="ระบุสรุปงานก่อนเลิกกะ หรือปัญหาที่พบ..."
                rows={3}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCheckOutModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>ยืนยันลงเวลาออกงาน</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
