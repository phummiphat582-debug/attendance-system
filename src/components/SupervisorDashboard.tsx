import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Download, 
  Building2, 
  Home, 
  Car, 
  Bell, 
  RefreshCw,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { GithubIcon } from './icons/GithubIcon';
import { MemberCalendarModal } from './MemberCalendarModal';
import type { AttendanceRecord, SystemSettings, UserProfile } from '../types/attendance';
import { attendanceService } from '../services/attendanceService';

interface SupervisorDashboardProps {
  currentUser: UserProfile;
  settings: SystemSettings;
  onOpenSettings: () => void;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  currentUser: _currentUser,
  settings,
  onOpenSettings,
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

  // Real-time toast alert when a staff member clocks in
  const [realtimeNotification, setRealtimeNotification] = useState<{
    userName: string;
    time: string;
    status: string;
    workType: string;
  } | null>(null);

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

    // Subscribe to Supabase Realtime changes
    const unsubscribe = attendanceService.subscribeToAttendance((newRecord) => {
      loadData(); // Refresh summary and table
      setRealtimeNotification({
        userName: newRecord.profile?.full_name || 'สมาชิกทีม',
        time: new Date(newRecord.check_in_time).toLocaleTimeString('th-TH'),
        status: newRecord.status === 'on_time' ? 'ตรงเวลา' : 'เข้างานสาย',
        workType: newRecord.work_type,
      });

      // Clear alert after 6 seconds
      setTimeout(() => setRealtimeNotification(null), 6000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

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

  // Export CSV Report with Thai BOM support for Excel
  const exportToCSV = () => {
    const headers = ['ชื่อ-นามสกุล', 'แผนก', 'GitHub', 'วันที่', 'เวลาเข้างาน', 'เวลาออกงาน', 'สถานะ', 'รูปแบบการทำงาน', 'บันทึกแผนงาน', 'ตำแหน่ง'];
    const rows = filteredRecords.map((r) => [
      r.profile?.full_name || 'N/A',
      r.profile?.department || 'N/A',
      r.profile?.github_username || '-',
      r.date,
      new Date(r.check_in_time).toLocaleTimeString('th-TH'),
      r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString('th-TH') : '-',
      r.status === 'on_time' ? 'ตรงเวลา' : 'เข้างานสาย',
      r.work_type,
      `"${(r.check_in_note || '').replace(/"/g, '""')}"`,
      `"${(r.location || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Real-time Alert Toast */}
      {realtimeNotification && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950 to-purple-950 border border-indigo-500/50 text-white flex items-center justify-between shadow-2xl shadow-indigo-500/20 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <p className="text-xs font-semibold text-indigo-200">
                🔔 แจ้งเตือนเข้างานแบบ Realtime!
              </p>
              <p className="text-sm font-medium">
                <span className="font-bold text-white">{realtimeNotification.userName}</span> ได้ลงเวลาเข้างานแล้ว เมื่อเวลา {realtimeNotification.time} ({realtimeNotification.status})
              </p>
            </div>
          </div>
          <button
            onClick={() => setRealtimeNotification(null)}
            className="text-xs text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <span>แดชบอร์ดหัวหน้างาน (Supervisor Overview)</span>
            <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Live Realtime
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ติดตามการลงเวลาประจำวันของทีมงาน พร้อมแจ้งเตือนผ่าน Webhook
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">รีเฟรช</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>ตั้งค่า Webhook</span>
          </button>

          <button
            onClick={exportToCSV}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </div>

      {/* Webhook Status Warning Banner if not configured */}
      {!settings.notify_webhook_url && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              ยังไม่ได้ตั้งค่า Webhook สำหรับแจ้งเตือนหัวหน้างาน (Discord / LINE / Telegram)
            </span>
          </div>
          <button
            onClick={onOpenSettings}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium underline"
          >
            ตั้งค่าเดี๋ยวนี้
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">ทีมงานทั้งหมด</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-white mt-2 font-mono">
            {summary.totalMembers} <span className="text-xs font-normal text-slate-500">คน</span>
          </p>
          <span className="text-[11px] text-slate-500 block mt-1">ประจำวันนี้</span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">เข้างานแล้ววันนี้</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-2 font-mono">
            {summary.checkedIn} <span className="text-xs font-normal text-slate-500">คน</span>
          </p>
          <span className="text-[11px] text-emerald-500/80 block mt-1">
            ตรงเวลา: {summary.onTime} คน
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">เข้างานสาย</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-amber-400 mt-2 font-mono">
            {summary.late} <span className="text-xs font-normal text-slate-500">คน</span>
          </p>
          <span className="text-[11px] text-amber-500/80 block mt-1">
            เกินเวลาเกณฑ์ ({settings.work_start_time || '09:00'})
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">ยังไม่ลงเวลา</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-rose-400 mt-2 font-mono">
            {summary.pending} <span className="text-xs font-normal text-slate-500">คน</span>
          </p>
          <span className="text-[11px] text-rose-500/80 block mt-1">
            ยังไม่บันทึกเข้างาน
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน, แผนก, หรือ GitHub..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg ${statusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setStatusFilter('on_time')}
              className={`px-2.5 py-1 rounded-lg ${statusFilter === 'on_time' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
            >
              ตรงเวลา
            </button>
            <button
              onClick={() => setStatusFilter('late')}
              className={`px-2.5 py-1 rounded-lg ${statusFilter === 'late' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
            >
              สาย
            </button>
          </div>

          {/* Work Type Filter */}
          <select
            value={workTypeFilter}
            onChange={(e) => setWorkTypeFilter(e.target.value as any)}
            className="bg-slate-950 text-xs text-slate-300 border border-slate-800 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">รูปแบบงานทั้งหมด</option>
            <option value="office">🏢 ทำงานที่ออฟฟิศ</option>
            <option value="wfh">🏠 ทำงานที่บ้าน (WFH)</option>
            <option value="onsite">🚗 ทำงานนอกสถานที่</option>
          </select>
        </div>
      </div>

      {/* Quick 30-Day Calendar Cards for All Team Members */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">
              ปฏิทินย้อนหลัง 30 วันของทีมงาน (คลิกรายคนเพื่อเปิดดูปฏิทิน)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            แสดงสถิติตรงเวลา/สาย/WFH ครบ 30 วัน
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {allMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => setSelectedMemberForCalendar(member)}
              className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-indigo-500/60 hover:bg-slate-900/90 text-left transition flex items-center justify-between group shadow-sm cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <img
                  src={member.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${member.full_name}`}
                  alt={member.full_name}
                  className="w-10 h-10 rounded-xl border border-slate-700 object-cover group-hover:border-indigo-400 transition"
                />
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                    {member.full_name}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {member.department}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold group-hover:bg-indigo-600 group-hover:text-white transition shrink-0 shadow-sm">
                <Calendar className="w-3.5 h-3.5" />
                <span>ปฏิทิน 30 วัน</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200">รายชื่อทีมงานที่ลงเวลาแล้ววันนี้</h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            แสดง {filteredRecords.length} รายการ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-3">พนักงาน / ทีมงาน</th>
                <th className="px-6 py-3">เวลาเข้างาน</th>
                <th className="px-6 py-3">เวลาออกงาน</th>
                <th className="px-6 py-3">สถานะ</th>
                <th className="px-6 py-3">รูปแบบการทำงาน</th>
                <th className="px-6 py-3">สถานที่ / พิกัด</th>
                <th className="px-6 py-3">บันทึกงานวันนี้</th>
                <th className="px-6 py-3">ปฏิทิน 30 วัน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    {searchTerm ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ยังไม่มีทีมงานลงเวลาเข้างานในวันนี้'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${item.profile?.full_name || 'User'}`}
                          alt={item.profile?.full_name}
                          className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                        />
                        <div>
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            {item.profile?.full_name || 'ไม่ระบุชื่อ'}
                            {item.profile?.github_username && (
                              <a
                                href={`https://github.com/${item.profile.github_username}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-500 hover:text-slate-300"
                                title="เปิด GitHub Profile"
                              >
                                <GithubIcon className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {item.profile?.department || 'ทีมงาน'} • {item.profile?.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 font-mono font-medium text-slate-200">
                      {new Date(item.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </td>

                    <td className="px-6 py-4 font-mono text-slate-400">
                      {item.check_out_time ? (
                        `${new Date(item.check_out_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">ยังไม่ออกงาน</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          item.status === 'on_time'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {item.status === 'on_time' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ตรงเวลา</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            <span>เข้างานสาย</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300">
                        {item.work_type === 'office' && <Building2 className="w-3.5 h-3.5 text-indigo-400" />}
                        {item.work_type === 'wfh' && <Home className="w-3.5 h-3.5 text-emerald-400" />}
                        {item.work_type === 'onsite' && <Car className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="capitalize">
                          {item.work_type === 'office' ? 'ออฟฟิศ' : item.work_type === 'wfh' ? 'WFH' : 'นอกสถานที่'}
                        </span>
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-400 max-w-xs truncate">
                      {item.location || 'สำนักงาน'}
                    </td>

                    <td className="px-6 py-4 text-slate-300 max-w-xs">
                      <p className="truncate" title={item.check_in_note || ''}>
                        {item.check_in_note || '-'}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedMemberForCalendar(item.profile || null)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
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

      {/* 30-Day Calendar Modal */}
      <MemberCalendarModal
        member={selectedMemberForCalendar}
        isOpen={Boolean(selectedMemberForCalendar)}
        onClose={() => setSelectedMemberForCalendar(null)}
      />
    </div>
  );
};
