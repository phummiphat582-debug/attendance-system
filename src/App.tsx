import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QuickClockInOut } from './components/QuickClockInOut';
import { MonthlyCalendarView } from './components/MonthlyCalendarView';
import { EmployeeManagerModal } from './components/EmployeeManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { attendanceService } from './services/attendanceService';
import type { SystemSettings, UserProfile } from './types/attendance';
import { Clock, Calendar, Users, Plus } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'clock' | 'calendar' | 'employees'>('clock');
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [activeEmployee, setActiveEmployee] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    company_name: 'ProTech Attendance',
    work_start_time: '08:30',
    late_threshold_minutes: 15,
    notify_webhook_url: '',
    notify_provider: 'discord',
    notify_on_checkin: true,
    notify_on_checkout: true,
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(() => attendanceService.isRealtimeConnected());
  const [loading, setLoading] = useState(true);

  // Load initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [allEmps, loadedSettings] = await Promise.all([
        attendanceService.getEmployees(),
        attendanceService.getSettings(),
      ]);
      setEmployees(allEmps);
      setSettings(loadedSettings);

      const active = attendanceService.getActiveEmployee();
      setActiveEmployee(active || allEmps[0] || null);
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = attendanceService.subscribeToUpdates(() => {
      handleEmployeesUpdated();
      setIsCloudConnected(attendanceService.isRealtimeConnected());
    });
    return () => unsubscribe();
  }, []);

  const handleSelectEmployee = (emp: UserProfile) => {
    attendanceService.setActiveEmployee(emp.id);
    setActiveEmployee(emp);
  };

  const handleEmployeesUpdated = () => {
    const updatedList = attendanceService.getEmployees();
    setEmployees(updatedList);
    const currentActive = attendanceService.getActiveEmployee();
    setActiveEmployee(currentActive || updatedList[0] || null);
    setIsCloudConnected(attendanceService.isRealtimeConnected());
  };

  const handleViewCalendar = (emp: UserProfile) => {
    handleSelectEmployee(emp);
    setActiveTab('calendar');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <Header
        currentUser={activeEmployee}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        isCloudConnected={isCloudConnected}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6 pb-28 sm:pb-32">
        {/* Realtime Cloud Sync Banner if not connected */}
        {!isCloudConnected && (
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 text-xs text-amber-950 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse flex-shrink-0"></span>
              <span>
                <strong>ซิงค์ข้อมูลเรียลไทม์ทุกเครื่อง?</strong>{' '}
                <span className="text-amber-800 hidden md:inline">เปิดใช้งานฐานข้อมูล Supabase เพื่อให้ทุกเครื่องเห็นข้อมูลตรงกันทันที</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCloudSyncOpen(true)}
              className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-bold transition flex-shrink-0 cursor-pointer shadow-xs text-center"
            >
              ⚡ เชื่อมต่อคลาวด์กลาง (10 วินาที)
            </button>
          </div>
        )}

        {/* Navigation Tabs (Mobile-first Segmented Bar) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('clock')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
                activeTab === 'clock'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>ลงเวลา<span className="hidden sm:inline">เข้างาน</span></span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 ${
                activeTab === 'calendar'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>ปฏิทิน<span className="hidden sm:inline">รายเดือน</span></span>
            </button>

            <button
              type="button"
              onClick={() => setIsEmployeeModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer text-slate-600 hover:text-slate-900 active:scale-95"
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span>ทีมงาน ({employees.length})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-2">
            <button
              type="button"
              onClick={() => setIsEmployeeModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>จัดการรายชื่อพนักงาน</span>
            </button>
          </div>
        </div>

        {/* Dynamic View Content */}
        {loading || !activeEmployee ? (
          <div className="py-24 text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-medium">กำลังเตรียมระบบลงเวลางาน...</p>
          </div>
        ) : activeTab === 'clock' ? (
          <QuickClockInOut
            employees={employees}
            activeEmployee={activeEmployee}
            settings={settings}
            onSelectEmployee={handleSelectEmployee}
            onOpenAddEmployee={() => setIsEmployeeModalOpen(true)}
            onViewCalendar={handleViewCalendar}
            onRecordUpdated={handleEmployeesUpdated}
          />
        ) : (
          <MonthlyCalendarView
            employees={employees}
            activeEmployee={activeEmployee}
            onSelectEmployee={handleSelectEmployee}
            onBackToClockInOut={() => setActiveTab('clock')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        ProTech Attendance System • ระบบลงเวลางานรวดเร็ว & ปฏิทินรายเดือนพนักงาน
      </footer>

      {/* Modals */}
      <EmployeeManagerModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        employees={employees}
        onEmployeesUpdated={handleEmployeesUpdated}
      />

      <SettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={(newSettings) => setSettings(newSettings)}
      />

      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        onStatusChanged={() => {
          handleEmployeesUpdated();
          setIsCloudConnected(attendanceService.isRealtimeConnected());
        }}
      />

      {/* PWA Install Floating Banner & Guide */}
      <PwaInstallPrompt />
    </div>
  );
}

export default App;
