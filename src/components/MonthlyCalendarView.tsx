import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Edit2,
  X,
  ArrowLeft
} from 'lucide-react';
import type { CalendarDayInfo, MonthlyStats, UserProfile, WorkType, AttendanceStatus } from '../types/attendance';
import { attendanceService } from '../services/attendanceService';

interface MonthlyCalendarViewProps {
  employees: UserProfile[];
  activeEmployee: UserProfile;
  onSelectEmployee: (emp: UserProfile) => void;
  onBackToClockInOut: () => void;
}

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  employees,
  activeEmployee,
  onSelectEmployee,
  onBackToClockInOut,
}) => {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(9); // 1-12 (Sept 2026 default)
  const [loading, setLoading] = useState(true);
  const [calendarDays, setCalendarDays] = useState<CalendarDayInfo[]>([]);
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDayInfo | null>(null);

  // Manual record modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [manualInTime, setManualInTime] = useState('08:30');
  const [manualWorkType, setManualWorkType] = useState<WorkType>('office');
  const [manualStatus, setManualStatus] = useState<AttendanceStatus>('on_time');
  const [manualNote, setManualNote] = useState('');

  const monthNamesThai = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const data = await attendanceService.getMonthlyCalendarData(activeEmployee.id, selectedYear, selectedMonth);
      setCalendarDays(data.days);
      setStats(data.stats);

      // Default select today or first day
      const todayMatch = data.days.find((d) => d.isToday) || data.days[0];
      setSelectedDay(todayMatch || null);
    } catch (err) {
      console.error('Failed to load monthly calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [activeEmployee.id, selectedYear, selectedMonth]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  const openManualEntry = (day?: CalendarDayInfo) => {
    const targetDate = day ? day.date : new Date().toISOString().split('T')[0];
    setManualDate(targetDate);
    if (day?.record) {
      const rec = day.record;
      const inT = new Date(rec.check_in_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      setManualInTime(inT);
      setManualWorkType(rec.work_type);
      setManualStatus(rec.status);
      setManualNote(rec.check_in_note || '');
    } else {
      setManualInTime('08:20');
      setManualWorkType('office');
      setManualStatus('on_time');
      setManualNote('');
    }
    setShowManualModal(true);
  };

  const handleSaveManualRecord = async () => {
    if (!manualDate || !manualInTime) return;
    await attendanceService.addManualRecord({
      userId: activeEmployee.id,
      date: manualDate,
      checkInTime: manualInTime,
      workType: manualWorkType,
      status: manualStatus,
      note: manualNote.trim(),
    });
    setShowManualModal(false);
    await loadCalendarData();
  };

  // Calculate day padding before 1st day of month (assuming Sunday = 0, Monday = 1 ... Saturday = 6)
  const firstDayOfWeek = calendarDays.length > 0 ? calendarDays[0].dayOfWeek : 0;
  const paddingDays = Array.from({ length: firstDayOfWeek });

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4">
        {/* Employee Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl border border-blue-200 p-0.5 overflow-hidden bg-white shadow-xs flex-shrink-0">
            <img
              src={activeEmployee.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${activeEmployee.full_name}`}
              alt={activeEmployee.full_name}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">
                {activeEmployee.full_name}
              </h2>
              <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200 flex-shrink-0">
                {activeEmployee.department}
              </span>
            </div>

            {/* Quick dropdown to switch member */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-slate-400">สลับคน:</span>
              <select
                value={activeEmployee.id}
                onChange={(e) => {
                  const emp = employees.find((item) => item.id === e.target.value);
                  if (emp) onSelectEmployee(emp);
                }}
                className="text-[11px] sm:text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2 py-0.5 outline-none cursor-pointer max-w-[170px] truncate"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.department})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap">
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 sm:p-1 border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition cursor-pointer active:scale-95"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <span className="text-xs sm:text-sm font-bold text-slate-800 px-2 sm:px-3 min-w-[110px] sm:min-w-[140px] text-center truncate">
              {monthNamesThai[selectedMonth - 1]} {selectedYear + 543}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition cursor-pointer active:scale-95"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleCurrentMonth}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition cursor-pointer active:scale-95"
          >
            ปัจจุบัน
          </button>

          <button
            type="button"
            onClick={onBackToClockInOut}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>กลับหน้าลงเวลา</span>
          </button>
        </div>
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div className="text-center py-2 text-xs text-blue-600 font-medium animate-pulse">
          กำลังโหลดข้อมูลปฏิทิน...
        </div>
      )}

      {/* 2. Monthly KPI Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
            <span className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span>อัตราเข้างาน</span>
            </span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
              {stats.attendanceRate}%
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block mt-0.5">
              มา {stats.attendedDays}/{stats.totalWorkDays} วัน
            </span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
            <span className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span>เข้างานตรงเวลา</span>
            </span>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1 font-mono">
              {stats.onTimeDays} <span className="text-xs text-slate-400 font-normal">วัน</span>
            </p>
            <span className="text-[10px] sm:text-[11px] text-emerald-600/90 block mt-0.5">
              ตรงเวลา {stats.onTimeRate}%
            </span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
            <span className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>มาสาย</span>
            </span>
            <p className="text-xl sm:text-2xl font-black text-amber-600 mt-1 font-mono">
              {stats.lateDays} <span className="text-xs text-slate-400 font-normal">วัน</span>
            </p>
            <span className="text-[10px] sm:text-[11px] text-amber-600/90 block mt-0.5">
              หลัง 08:30 น.
            </span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
            <span className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1 font-medium">
              <XCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span>ไม่ได้ลงเวลา</span>
            </span>
            <p className="text-xl sm:text-2xl font-black text-rose-600 mt-1 font-mono">
              {stats.absentDays} <span className="text-xs text-slate-400 font-normal">วัน</span>
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block mt-0.5">
              ไม่มีบันทึก
            </span>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
              <span>มาทำงานรวม</span>
            </span>
            <p className="text-xl sm:text-2xl font-black text-indigo-600 mt-1 font-mono">
              {stats.attendedDays} <span className="text-xs text-slate-400 font-normal">วัน</span>
            </p>
            <span className="text-[10px] sm:text-[11px] text-slate-400 block mt-0.5">
              🏢 {stats.officeDays} • 🏠 {stats.wfhDays} • 🚗 {stats.onsiteDays}
            </span>
          </div>
        </div>
      )}

      {/* 3. Main Calendar Grid */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-6 shadow-xs">
        {/* Days of Week Header (Short Thai names on mobile, full on desktop) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[11px] sm:text-xs font-bold text-slate-400">
          <div className="py-1.5 sm:py-2 text-rose-500"><span className="sm:hidden">อา.</span><span className="hidden sm:inline">อาทิตย์</span></div>
          <div className="py-1.5 sm:py-2"><span className="sm:hidden">จ.</span><span className="hidden sm:inline">จันทร์</span></div>
          <div className="py-1.5 sm:py-2"><span className="sm:hidden">อ.</span><span className="hidden sm:inline">อังคาร</span></div>
          <div className="py-1.5 sm:py-2"><span className="sm:hidden">พ.</span><span className="hidden sm:inline">พุธ</span></div>
          <div className="py-1.5 sm:py-2"><span className="sm:hidden">พฤ.</span><span className="hidden sm:inline">พฤหัสบดี</span></div>
          <div className="py-1.5 sm:py-2"><span className="sm:hidden">ศ.</span><span className="hidden sm:inline">ศุกร์</span></div>
          <div className="py-1.5 sm:py-2 text-rose-500"><span className="sm:hidden">ส.</span><span className="hidden sm:inline">เสาร์</span></div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {/* Empty cells padding for start of month */}
          {paddingDays.map((_, idx) => (
            <div key={`pad-${idx}`} className="h-16 sm:h-24 bg-slate-50/40 rounded-xl border border-dashed border-slate-100 opacity-40"></div>
          ))}

          {/* Actual Month Days */}
          {calendarDays.map((day) => {
            const isSelected = selectedDay?.date === day.date;
            const rec = day.record;

            let badgeClass = 'bg-slate-100 text-slate-500 border-slate-200';
            let statusLabel = '';

            if (day.status === 'on_time') {
              badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              statusLabel = 'ตรงเวลา';
            } else if (day.status === 'late') {
              badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
              statusLabel = 'สาย';
            } else if (day.status === 'absent') {
              badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
              statusLabel = 'ไม่ได้ลง';
            } else if (day.status === 'weekend') {
              badgeClass = 'bg-slate-100/70 text-slate-400 border-slate-200';
              statusLabel = 'วันหยุด';
            } else if (day.status === 'pending') {
              badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
              statusLabel = 'รอลงเวลา';
            }

            return (
              <div
                key={day.date}
                onClick={() => setSelectedDay(day)}
                className={`min-h-[60px] sm:h-24 p-1 sm:p-2 rounded-xl border flex flex-col justify-between transition cursor-pointer relative overflow-hidden active:scale-95 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/30 shadow-xs'
                    : day.isToday
                    ? 'border-blue-400 bg-blue-50/20'
                    : day.isWeekend
                    ? 'border-slate-200/60 bg-slate-50/50'
                    : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                {/* Day Number and Today indicator */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] sm:text-xs font-bold ${
                      day.isToday
                        ? 'w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-mono shadow-xs'
                        : day.isWeekend
                        ? 'text-rose-400 font-mono'
                        : 'text-slate-800 font-mono'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  {rec && (
                    <span className="text-[9px] sm:text-[10px] text-slate-400">
                      {rec.work_type === 'office' ? '🏢' : rec.work_type === 'wfh' ? '🏠' : '🚗'}
                    </span>
                  )}
                </div>

                {/* Status / Check-in time badge */}
                <div className="mt-auto">
                  {rec ? (
                    <div className="space-y-0.5">
                      <div className={`px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded text-[9px] sm:text-[11px] font-bold border truncate ${badgeClass}`}>
                        {new Date(rec.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ) : day.isFuture ? (
                    <span className="text-[10px] text-slate-300 block text-center">-</span>
                  ) : (
                    <span className={`px-0.5 sm:px-1 py-0.2 sm:py-0.5 rounded text-[8px] sm:text-[10px] font-medium border block text-center truncate ${badgeClass}`}>
                      {statusLabel}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Day Details Inspector Box */}
      {selectedDay && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold font-mono text-xs sm:text-sm border border-blue-200 flex-shrink-0">
              {selectedDay.dayNumber}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  {selectedDay.dayName}ที่ {selectedDay.dayNumber} {monthNamesThai[selectedMonth - 1]} {selectedYear + 543}
                </h4>
                {selectedDay.isToday && (
                  <span className="text-[9px] sm:text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full font-bold">
                    วันนี้
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                {selectedDay.record ? (
                  <>
                    เข้างาน: <strong className="text-slate-800">{new Date(selectedDay.record.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</strong>
                    {' '}• {selectedDay.record.work_type === 'office' ? '🏢 ออฟฟิศ' : selectedDay.record.work_type === 'wfh' ? '🏠 WFH' : '🚗 ไซต์งาน'}
                    {selectedDay.record.check_in_note ? ` • หมายเหตุ: "${selectedDay.record.check_in_note}"` : ''}
                  </>
                ) : (
                  <span>ไม่มีประวัติการลงเวลาในวันนี้</span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openManualEntry(selectedDay)}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer active:scale-95"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{selectedDay.record ? 'แก้ไขรายการนี้' : 'ลงเวลาย้อนหลังวันนี้'}</span>
          </button>
        </div>
      )}


      {/* Manual Entry / Edit Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>บันทึก/แก้ไขเวลาเข้างาน ({activeEmployee.full_name})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">วันที่</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">เวลาเข้างาน</label>
                <input
                  type="time"
                  value={manualInTime}
                  onChange={(e) => setManualInTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะ</label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white cursor-pointer"
                  >
                    <option value="on_time">🟢 ตรงเวลา</option>
                    <option value="late">🟠 สาย</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">สถานที่ทำงาน</label>
                  <select
                    value={manualWorkType}
                    onChange={(e) => setManualWorkType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white cursor-pointer"
                  >
                    <option value="office">🏢 ออฟฟิศ</option>
                    <option value="wfh">🏠 WFH</option>
                    <option value="onsite">🚗 ไซต์งาน</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  placeholder="เช่น ลืมลงเวลา, แก้ไขข้อมูลตามใบรับรอง..."
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveManualRecord}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm cursor-pointer"
              >
                บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
