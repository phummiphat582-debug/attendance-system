import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Download, 
  Bell, 
  RefreshCw,
  Calendar,
  Shield,
  ShieldAlert,
  Send,
  Loader2
} from 'lucide-react';
import { MemberCalendarModal } from './MemberCalendarModal';
import type { AttendanceRecord, SystemSettings, UserProfile } from '../types/attendance';
import { attendanceService } from '../services/attendanceService';
import { testWebhookNotification } from '../lib/notifications';

interface SupervisorBackofficeProps {
  currentUser: UserProfile;
  settings: SystemSettings;
  onOpenSettings: () => void;
  onSwitchToManager: () => void;
}

export const SupervisorBackoffice: React.FC<SupervisorBackofficeProps> = ({
  currentUser,
  settings,
  onOpenSettings,
  onSwitchToManager,
}) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState({
    totalMembers: 0,
    checkedIn: 0,
    pending: 0,
    late: 0,
    onTime: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_time' | 'late' | 'pending'>('all');
  const [workTypeFilter, setWorkTypeFilter] = useState<'all' | 'office' | 'wfh' | 'onsite'>('all');
  const [selectedMemberForCalendar, setSelectedMemberForCalendar] = useState<UserProfile | null>(null);
  const [allMembers, setAllMembers] = useState<UserProfile[]>([]);

  // Testing webhook state
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookFeedback, setWebhookFeedback] = useState<string | null>(null);

  // Real-time toast alert when a staff member clocks in
  const [realtimeNotification, setRealtimeNotification] = useState<{
    userName: string;
    time: string;
    status: string;
    workType: string;
  } | null>(null);

  const isSupervisor = currentUser.role === 'manager' || currentUser.role === 'admin';

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await attendanceService.getTodayTeamAttendance();
      setRecords(data.records);
      setSummary(data.summary);
      setAllMembers(attendanceService.getMockProfiles().filter((p) => p.role === 'employee'));
    } catch (err) {
      console.error('Failed to load supervisor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = attendanceService.subscribeToAttendance((newRecord) => {
      loadData();
      setRealtimeNotification({
        userName: newRecord.profile?.full_name || 'ช่างเทคนิค',
        time: new Date(newRecord.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        status: newRecord.status === 'on_time' ? 'ตรงเวลา' : 'เข้างานสาย',
        workType: newRecord.work_type,
      });

      setTimeout(() => setRealtimeNotification(null), 6000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookFeedback(null);
    try {
      const res = await testWebhookNotification(settings);
      setWebhookFeedback(res.message);
      setTimeout(() => setWebhookFeedback(null), 4000);
    } catch (e: any) {
      setWebhookFeedback(e.message || 'เกิดข้อผิดพลาด');
    } finally {
      setTestingWebhook(false);
    }
  };

  // Filter records
  const filteredRecords = records.filter((rec) => {
    const profile = rec.profile;
    const nameMatch = 
      (profile?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (profile?.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (profile?.github_username || '').toLowerCase().includes(searchTerm.toLowerCase());

    const statusMatch = statusFilter === 'all' || rec.status === statusFilter;
    const workTypeMatch = workTypeFilter === 'all' || rec.work_type === workTypeFilter;

    return nameMatch && statusMatch && workTypeMatch;
  });

  // Export CSV Report with Thai BOM for Microsoft Excel
  const exportToCSV = () => {
    const headers = ['ชื่อ-นามสกุล', 'แผนก/กะงาน', 'วันที่', 'เวลาเข้ากะ', 'เวลาออกกะ', 'สถานะ', 'รูปแบบการทำงาน', 'บันทึกงานช่าง', 'ไซต์งาน/พิกัด'];
    const rows = filteredRecords.map((r) => [
      r.profile?.full_name || 'N/A',
      r.profile?.department || 'N/A',
      r.date,
      new Date(r.check_in_time).toLocaleTimeString('th-TH'),
      r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('th-TH') : 'ยังไม่ออกกะ',
      r.status === 'on_time' ? 'ตรงเวลา' : 'เข้างานสาย',
      r.work_type === 'office' ? 'ในไซต์/โรงงาน' : r.work_type === 'wfh' ? 'WFH/วางสเปก' : 'ตรวจนอกสถานที่',
      `"${(r.check_in_note || '').replace(/"/g, '""')}"`,
      `"${(r.location || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ProTech_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If NOT a supervisor, display clear security gate
  if (!isSupervisor) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 shadow-xs text-center max-w-2xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          ระบบหลังบ้านสงวนสิทธิ์เฉพาะหัวหน้างาน (Supervisor Portal)
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-lg mx-auto">
          ขณะนี้คุณเข้าสู่ระบบในฐานะ <span className="font-semibold text-slate-800">{currentUser.full_name} ({currentUser.department})</span> ซึ่งมีสิทธิ์ระดับช่างเทคนิค
        </p>
        <div className="pt-3">
          <button
            type="button"
            onClick={onSwitchToManager}
            className="px-6 py-3 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-950/10 inline-flex items-center gap-2 cursor-pointer"
          >
            <Shield className="w-4 h-4 text-amber-300" />
            <span>สลับเป็นบัญชีหัวหน้างาน (คุณกัญญา - Lead Supervisor)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Real-time Alert Toast */}
      {realtimeNotification && (
        <div className="p-4 rounded-xl bg-blue-900 text-white flex items-center justify-between shadow-lg shadow-blue-950/15 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <p className="text-xs font-semibold text-blue-200">
                🔔 แจ้งเตือนเข้างานแบบ Realtime!
              </p>
              <p className="text-sm font-medium">
                <span className="font-bold text-white">{realtimeNotification.userName}</span> ได้ลงเวลาเข้ากะแล้ว เมื่อ {realtimeNotification.time} น. ({realtimeNotification.status})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRealtimeNotification(null)}
            className="text-xs text-blue-200 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Backoffice Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center">
              <Shield className="w-4 h-4 text-amber-300" />
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              ระบบหลังบ้านเฉพาะหัวหน้างาน (Supervisor Management Portal)
            </h2>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live Realtime
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ตรวจสอบการลงเวลาของทีมช่างเทคนิคทุกไซต์งาน พร้อมระบบแจ้งเตือน Webhook และปฏิทินย้อนหลัง 30 วัน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-700 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            <span>ตั้งค่า Webhook</span>
          </button>

          <button
            type="button"
            onClick={exportToCSV}
            className="px-4 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>ส่งออกรายงาน Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">ทีมช่างเทคนิคทั้งหมด</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2 font-mono">
            {summary.totalMembers} <span className="text-xs font-normal text-slate-500">คน</span>
          </p>
          <span className="text-[11px] text-slate-400 block mt-1">ประจำไซต์งานทั้งหมด</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">เข้างานแล้ววันนี้</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-2 font-mono">
            {summary.checkedIn} <span className="text-xs font-normal text-slate-500">คน</span>
          </p>
          <span className="text-[11px] text-emerald-600 block mt-1">
            ตรงเวลา: {summary.onTime} คน
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">เข้างานสาย</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-700 mt-2 font-mono">
            {summary.late} <span className="text-xs font-normal text-slate-500">คน</span>
          </p>
          <span className="text-[11px] text-amber-600 block mt-1">
            เกินเกณฑ์ ({settings.work_start_time || '08:30'} น.)
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">ยังไม่ลงเวลาเข้ากะ</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-rose-700 mt-2 font-mono">
            {summary.pending} <span className="text-xs font-normal text-slate-500">คน</span>
          </p>
          <span className="text-[11px] text-rose-500 block mt-1">
            รอติดตามเข้ากะ
          </span>
        </div>
      </div>

      {/* QUICK 30-DAY CALENDAR CARDS FOR ALL TECHNICIANS */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-700 text-xl">calendar_month</span>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              ปฏิทินย้อนหลัง 30 วันของทีมช่าง (คลิกรายคนเพื่อเปิดดูปฏิทินทันที)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            แสดงสถิติตรงเวลา/สาย/หน้างาน ครบ 30 วัน
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {allMembers.map((member) => (
            <div
              key={member.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-300 transition flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full border-2 border-blue-600/20 p-0.5 overflow-hidden flex-shrink-0 bg-white shadow-xs">
                  <img
                    src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.full_name}`}
                    alt={member.full_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {member.full_name}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {member.department}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMemberForCalendar(member)}
                className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 shadow-xs cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-200" />
                <span>ปฏิทิน 30 วัน</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อช่างเทคนิค, แผนก หรือไซต์งาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('on_time')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${statusFilter === 'on_time' ? 'bg-emerald-600 text-white' : 'text-slate-600'}`}
            >
              ตรงเวลา
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('late')}
              className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer ${statusFilter === 'late' ? 'bg-amber-600 text-white' : 'text-slate-600'}`}
            >
              สาย
            </button>
          </div>

          {/* Work Type Filter */}
          <select
            value={workTypeFilter}
            onChange={(e) => setWorkTypeFilter(e.target.value as any)}
            className="bg-slate-50 text-xs text-slate-700 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:bg-white focus:border-blue-600 cursor-pointer"
          >
            <option value="all">รูปแบบงานทั้งหมด</option>
            <option value="office">🏢 ในไซต์ / โรงงาน</option>
            <option value="wfh">💻 WFH / วางสเปก</option>
            <option value="onsite">🚗 ตรวจงานนอกสถานที่</option>
          </select>
        </div>
      </div>

      {/* TODAY'S TEAM ATTENDANCE TABLE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-700 text-xl">checklist</span>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              รายชื่อช่างเทคนิคที่ลงเวลาเข้ากะวันนี้
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            แสดง {filteredRecords.length} รายการ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70">
                <th className="py-3 px-4 sm:px-6">ช่างเทคนิค</th>
                <th className="py-3 px-4 sm:px-6">เวลาเข้ากะ</th>
                <th className="py-3 px-4 sm:px-6">เวลาออกกะ</th>
                <th className="py-3 px-4 sm:px-6">สถานะ</th>
                <th className="py-3 px-4 sm:px-6">รูปแบบการทำงาน</th>
                <th className="py-3 px-4 sm:px-6">ไซต์งาน / พิกัด</th>
                <th className="py-3 px-4 sm:px-6">บันทึกงานวันนี้</th>
                <th className="py-3 px-4 sm:px-6 text-right">ปฏิทิน 30 วัน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-normal">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    {searchTerm ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ยังไม่มีช่างเทคนิคลงเวลาเข้างานในวันนี้'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full border border-slate-200 overflow-hidden flex-shrink-0 bg-white">
                          <img
                            src={item.profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.profile?.full_name || 'Tech'}`}
                            alt={item.profile?.full_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {item.profile?.full_name || 'ไม่ระบุชื่อ'}
                          </p>
                          <span className="text-[11px] text-slate-500">
                            {item.profile?.department || 'ช่างเทคนิค'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 font-mono font-bold text-slate-900">
                      {new Date(item.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 font-mono text-slate-500">
                      {item.check_out_time ? (
                        `${new Date(item.check_out_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
                      ) : (
                        <span className="text-xs text-slate-400 italic">ยังไม่ออกกะ</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          item.status === 'on_time'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {item.status === 'on_time' ? 'ตรงเวลา' : 'เข้างานสาย'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 sm:px-6">
                      <span className="inline-flex items-center gap-1 text-slate-700 text-xs font-medium">
                        <span className="material-symbols-outlined text-sm text-blue-600">
                          {item.work_type === 'office' ? 'apartment' : item.work_type === 'wfh' ? 'computer' : 'directions_car'}
                        </span>
                        <span>
                          {item.work_type === 'office' ? 'ในไซต์/โรงงาน' : item.work_type === 'wfh' ? 'WFH' : 'ตรวจนอกสถานที่'}
                        </span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-slate-600 text-xs max-w-xs truncate">
                      {item.location || 'สถานี 04 พระราม 9'}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-slate-700 text-xs max-w-xs truncate">
                      {item.check_in_note || '-'}
                    </td>

                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedMemberForCalendar(item.profile || null)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 text-blue-800 text-xs font-semibold inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-blue-700" />
                        <span>เปิดปฏิทิน</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUPERVISOR SETTINGS & WEBHOOK QUICK TEST */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-700" />
            <h4 className="text-sm font-bold text-slate-900">
              ช่องทางการแจ้งเตือนหัวหน้างาน (Notification Webhook)
            </h4>
          </div>
          <p className="text-xs text-slate-500">
            ปลายทางปัจจุบัน: <span className="font-semibold text-slate-700 capitalize">{settings.notify_provider || 'Discord'}</span> • เกณฑ์เริ่มกะงาน: <span className="font-semibold text-slate-700">{settings.work_start_time || '08:30'} น.</span> (ผ่อนปรน {settings.late_threshold_minutes || 15} นาที)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {webhookFeedback && (
            <span className="text-xs text-emerald-700 font-semibold mr-2 animate-in fade-in">
              {webhookFeedback}
            </span>
          )}

          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={testingWebhook || !settings.notify_webhook_url}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            title="ทดสอบยิงข้อความเข้าห้องแชทของหัวหน้างาน"
          >
            {testingWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-blue-700" />}
            <span>ทดสอบส่งข้อความแจ้งเตือน</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition cursor-pointer"
          >
            แก้ไขการตั้งค่า
          </button>
        </div>
      </div>

      {/* 30-Day Calendar Modal */}
      <MemberCalendarModal
        member={selectedMemberForCalendar}
        isOpen={Boolean(selectedMemberForCalendar)}
        onClose={() => setSelectedMemberForCalendar(null)}
      />

    </div>
  );
};
