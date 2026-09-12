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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0 flex items-center justify-center p-0.5 sm:p-1 shadow-xs">
            <img
              alt="ProTech Logo"
              className="w-full h-full object-contain"
              src="https://lh3.googleusercontent.com/aida/AEtjO1VBYtZYx9K12-sw8uTUmTaJdb95Kl3zy1d4M9RwyyZ7cH9608DgO0A7JsqJk_NVQYJsFdAI0jGLxUfNJzd_ir2XirwYWItSTkJ0nyxaRg_gE3rpf-fPNk1hSweeg2gQ6UBjaaOgkYqPWBU9hUrIY7zVvpJprXaylgba9c8iG1l0lXtHy-Gk8rhjK_fF-RwXR8jGlvDnibbDm7gfeDGIGRE7MhRnNXuyKy7N2MTIjp2lcpE-HTN-dykynRA7"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base text-slate-900 tracking-tight font-display truncate">ProTech</span>
              <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.2 sm:py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 flex-shrink-0">
                ลงเวลางาน
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:block truncate">บันทึกเวลาปฏิบัติงานช่างและทีมงาน</span>
          </div>
        </div>

        {/* Live Clock & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* UTC+7 Live Digital Clock (Desktop/Tablet) */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 font-medium border border-blue-100 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-mono text-[13px] font-semibold">{formattedTime}</span>
            <span className="text-[10px] text-blue-600 font-semibold">UTC+7</span>
          </div>

          {/* User Name Pill */}
          {currentUser && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="truncate max-w-[110px]">{currentUser.full_name}</span>
            </div>
          )}

          {/* PWA Install Button */}
          <button
            type="button"
            onClick={handleInstallApp}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-700 border border-emerald-200 text-xs font-semibold transition cursor-pointer shadow-xs"
            title="ติดตั้งเป็นเว็บแอปบนมือถือ / PC"
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden sm:inline">ติดตั้งแอป</span>
          </button>

          {/* Cloud Sync Status Pill */}
          {onOpenCloudSync && (
            <button
              type="button"
              onClick={onOpenCloudSync}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border shadow-2xs active:scale-95 ${
                isCloudConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="สถานะฐานข้อมูลเรียลไทม์ (แตะเพื่อดูรายละเอียด)"
            >
              <Cloud className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="hidden sm:inline">{isCloudConnected ? '🟢 คลาวด์เรียลไทม์' : '🟠 ฐานข้อมูลกลาง'}</span>
              <span className="sm:hidden">{isCloudConnected ? '🟢 คลาวด์' : '🟠 ออฟไลน์'}</span>
            </button>
          )}

          {/* Settings Modal Shortcut */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 transition cursor-pointer"
            title="ตั้งค่าระบบ / Webhook แจ้งเตือนหัวหน้างาน"
          >
            <Settings className="w-4 h-4 text-slate-600" />
          </button>
        </div>

      </div>
    </header>
  );
};
