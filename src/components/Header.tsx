import React, { useState, useEffect } from 'react';
import { Settings, Download, Cloud } from 'lucide-react';
import type { UserProfile } from '../types/attendance';

interface HeaderProps {
  currentUser: UserProfile | null;
  onOpenSettings: () => void;
  onOpenCloudSync?: () => void;
  isCloudConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenSettings,
  onOpenCloudSync,
  isCloudConnected = false,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeinstallprompt', handlePrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    } else {
      alert(
        '📱 วิธีติดตั้ง ProTech เป็นเว็บแอปบนมือถือ:\n\n• บน Android / Chrome: แตะที่เมนู 3 จุดมุมบน ➔ เลือก "ติดตั้งแอป" หรือ "เพิ่มลงในหน้าจอหลัก"\n• บน iOS / Safari: แตะที่ปุ่มแชร์ (Share) ➔ เลือก "เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)"'
      );
    }
  };

  const formattedTime = currentTime.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0 flex items-center justify-center p-1 shadow-xs">
            <img
              alt="ProTech Logo"
              className="w-full h-full object-contain"
              src="https://lh3.googleusercontent.com/aida/AEtjO1VBYtZYx9K12-sw8uTUmTaJdb95Kl3zy1d4M9RwyyZ7cH9608DgO0A7JsqJk_NVQYJsFdAI0jGLxUfNJzd_ir2XirwYWItSTkJ0nyxaRg_gE3rpf-fPNk1hSweeg2gQ6UBjaaOgkYqPWBU9hUrIY7zVvpJprXaylgba9c8iG1l0lXtHy-Gk8rhjK_fF-RwXR8jGlvDnibbDm7gfeDGIGRE7MhRnNXuyKy7N2MTIjp2lcpE-HTN-dykynRA7"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 tracking-tight font-display">ProTech</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200/60">
                ระบบลงเวลางาน
              </span>
            </div>
            <span className="text-xs text-slate-500 font-medium">บันทึกเวลาปฏิบัติงานช่างและทีมงาน</span>
          </div>
        </div>

        {/* Live Clock & Actions */}
        <div className="flex items-center gap-2.5">
          {/* UTC+7 Live Digital Clock */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 font-medium border border-blue-100 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[13px] font-semibold">{formattedTime}</span>
            <span className="text-[10px] text-blue-600 font-semibold">UTC+7</span>
          </div>

          {/* User Name Pill */}
          {currentUser && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="truncate max-w-[120px]">{currentUser.full_name}</span>
            </div>
          )}

          {/* PWA Install Button */}
          <button
            type="button"
            onClick={handleInstallApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition cursor-pointer shadow-xs"
            title="ติดตั้งเป็นเว็บแอปบนมือถือ / PC"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ติดตั้งแอป</span>
          </button>

          {/* Cloud Sync Status Pill */}
          {onOpenCloudSync && (
            <button
              type="button"
              onClick={onOpenCloudSync}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-2xs ${
                isCloudConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="สถานะฐานข้อมูลเรียลไทม์ (คลิกเพื่อดูรายละเอียด)"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{isCloudConnected ? '🟢 คลาวด์เรียลไทม์' : '🟠 ฐานข้อมูลกลาง'}</span>
            </button>
          )}

          {/* Settings Modal Shortcut (Supervisor Webhook setup) */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="ตั้งค่าระบบ / Webhook แจ้งเตือนหัวหน้างาน"
          >
            <Settings className="w-4 h-4 text-slate-600" />
          </button>
        </div>

      </div>
    </header>
  );
};
