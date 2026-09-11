import React, { useState, useEffect } from 'react';
import { 
  X, 
  Loader2, 
  MapPin, 
  FileText,
  Clock
} from 'lucide-react';
import type { AttendanceRecord, UserProfile } from '../types/attendance';
import { attendanceService } from '../services/attendanceService';

interface MemberCalendarModalProps {
  member: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MemberCalendarModal: React.FC<MemberCalendarModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    days: {
      date: string;
      dayOfWeek: number;
      dayName: string;
      formattedDate: string;
      isWeekend: boolean;
      isToday: boolean;
      record?: AttendanceRecord;
      status: 'on_time' | 'late' | 'weekend' | 'absent' | 'pending' | 'future';
    }[];
    stats: {
      totalWorkDays: number;
      onTimeDays: number;
      lateDays: number;
      absentDays: number;
      wfhDays: number;
      officeDays: number;
      onsiteDays: number;
    };
  } | null>(null);

  const [selectedDay, setSelectedDay] = useState<any>(null);

  useEffect(() => {
    if (!member || !isOpen) return;

    const loadCalendar = async () => {
      setLoading(true);
      try {
        const res = await attendanceService.getMember30DayAttendance(member.id);
        setData(res);
        const today = res.days[res.days.length - 1];
        setSelectedDay(today);
      } catch (err) {
        console.error('Error loading calendar:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCalendar();
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200/90 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Header Bar (Clean White & Navy) */}
        <div className="p-5 sm:p-6 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full border-2 border-blue-600/20 p-0.5 overflow-hidden flex-shrink-0 bg-white shadow-xs">
              <img
                src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.full_name}`}
                alt={member.full_name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {member.full_name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                  ช่างเทคนิค
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {member.department} • ปฏิทินลงเวลาย้อนหลัง 30 วัน
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {loading || !data ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-700 mx-auto" />
              <p className="text-xs">กำลังโหลดและคำนวณปฏิทิน 30 วัน...</p>
            </div>
          ) : (
            <>
              {/* 30-Day Monthly KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-sm text-emerald-600">check_circle</span>
                    เข้างานตรงเวลา
                  </span>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-2xl font-bold font-mono text-slate-900">
                      {data.stats.onTimeDays}
                    </span>
                    <span className="text-xs text-slate-500">
                      / {data.stats.totalWorkDays} วัน
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-sm text-amber-600">schedule</span>
                    เข้างานสาย
                  </span>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-2xl font-bold font-mono text-amber-700">
                      {data.stats.lateDays}
                    </span>
                    <span className="text-xs text-slate-500">วัน</span>
                  </div>
                </div>

                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-sm text-blue-600">apartment</span>
                    ในไซต์ / โรงงาน
                  </span>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-2xl font-bold font-mono text-blue-900">
                      {data.stats.officeDays}
                    </span>
                    <span className="text-xs text-slate-500">วัน</span>
                  </div>
                </div>

                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-sm text-slate-600">directions_car</span>
                    ตรวจนอกสถานที่ / WFH
                  </span>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-2xl font-bold font-mono text-slate-800">
                      {data.stats.onsiteDays + data.stats.wfhDays}
                    </span>
                    <span className="text-xs text-slate-500">วัน</span>
                  </div>
                </div>
              </div>

              {/* Legend Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-600 font-medium">สัญลักษณ์สีสถานะ:</span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-500"></span>
                    <span className="text-emerald-700 font-medium">ตรงเวลา</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-500"></span>
                    <span className="text-amber-700 font-medium">เข้างานสาย</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-slate-200 border border-slate-300"></span>
                    <span className="text-slate-500 font-medium">วันหยุดเสาร์-อาทิตย์</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-rose-100 border border-rose-400"></span>
                    <span className="text-rose-700 font-medium">ยังไม่ลงเวลา</span>
                  </span>
                </div>
              </div>

              {/* Interactive 30-Day Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-blue-700">calendar_month</span>
                    <span>คลิกเลือกวันที่ในปฏิทิน เพื่อตรวจสอบรายละเอียดเชิงลึก</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">30 วันล่าสุด</span>
                </div>

                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-10 gap-2">
                  {data.days.map((day, idx) => {
                    const isSelected = selectedDay?.date === day.date;
                    const statusClass =
                      day.status === 'on_time'
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 hover:border-emerald-500'
                        : day.status === 'late'
                        ? 'bg-amber-50/70 border-amber-300 text-amber-900 hover:border-amber-500'
                        : day.status === 'weekend'
                        ? 'bg-slate-100/60 border-slate-200 text-slate-400 hover:border-slate-300'
                        : day.status === 'pending'
                        ? 'bg-blue-50/70 border-blue-300 text-blue-900 hover:border-blue-500'
                        : 'bg-rose-50/70 border-rose-300 text-rose-900 hover:border-rose-500';

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`p-2 rounded-xl border text-left flex flex-col justify-between h-20 transition-all cursor-pointer ${statusClass} ${
                          isSelected ? 'ring-2 ring-blue-700 ring-offset-2 ring-offset-white shadow-xs font-bold' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold font-mono">
                            {day.formattedDate}
                          </span>
                          {day.isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                          )}
                        </div>

                        <div className="mt-auto">
                          <span className="text-[10px] block opacity-80 truncate">
                            {day.dayName.slice(0, 3)}
                          </span>

                          {day.record ? (
                            <span className="text-[10px] font-mono block truncate font-bold">
                              {new Date(day.record.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            <span className="text-[10px] block opacity-60 truncate">
                              {day.isWeekend ? 'วันหยุด' : day.isToday ? 'วันนี้' : '-'}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Day Detailed Card */}
              {selectedDay && (
                <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          วันที่ {selectedDay.date} ({selectedDay.dayName})
                        </h4>
                        <span className="text-xs text-slate-500">
                          {selectedDay.isToday ? 'วันปฏิบัติงานปัจจุบัน' : selectedDay.isWeekend ? 'วันหยุดสุดสัปดาห์' : 'วันทำการปกติ'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        selectedDay.status === 'on_time'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : selectedDay.status === 'late'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : selectedDay.status === 'weekend'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {selectedDay.status === 'on_time'
                        ? '✓ เข้างานตรงเวลา'
                        : selectedDay.status === 'late'
                        ? '⚠️ เข้างานสาย'
                        : selectedDay.status === 'weekend'
                        ? 'วันหยุดประจำสัปดาห์'
                        : 'ยังไม่ได้ลงเวลา'}
                    </span>
                  </div>

                  {selectedDay.record ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-xs text-slate-500 block mb-0.5 font-medium">เวลาเข้ากะ (Clock In)</span>
                        <span className="text-base font-bold font-mono text-slate-900">
                          {new Date(selectedDay.record.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                        </span>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-xs text-slate-500 block mb-0.5 font-medium">เวลาออกกะ (Clock Out)</span>
                        <span className="text-base font-bold font-mono text-slate-900">
                          {selectedDay.record.check_out_time
                            ? `${new Date(selectedDay.record.check_out_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
                            : 'ยังไม่ออกกะ'}
                        </span>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-xs text-slate-500 block mb-0.5 font-medium">รูปแบบการปฏิบัติงาน</span>
                        <span className="text-sm font-bold text-blue-900 flex items-center gap-1.5 mt-0.5">
                          <span className="material-symbols-outlined text-base text-blue-700">
                            {selectedDay.record.work_type === 'office' ? 'apartment' : selectedDay.record.work_type === 'wfh' ? 'computer' : 'directions_car'}
                          </span>
                          <span>
                            {selectedDay.record.work_type === 'office' ? 'ในไซต์ / โรงงาน' : selectedDay.record.work_type === 'wfh' ? 'WFH / วางสเปก' : 'ตรวจงานนอกสถานที่'}
                          </span>
                        </span>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-xs text-slate-500 block mb-0.5 font-medium">ไซต์งาน / พิกัด</span>
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{selectedDay.record.location || 'สถานี 04 พระราม 9'}</span>
                        </span>
                      </div>

                      <div className="sm:col-span-2 md:col-span-4 bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>บันทึกงานช่างประจำวัน:</span>
                        </span>
                        <p className="text-xs text-slate-800">
                          {selectedDay.record.check_in_note || 'ไม่มีบันทึกรายละเอียด'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-slate-400 text-xs">
                      {selectedDay.isWeekend ? 'เป็นวันหยุดสุดสัปดาห์' : 'ไม่มีบันทึกการลงเวลาในวันนี้'}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
