import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share2, PlusSquare } from 'lucide-react';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    if (standalone) {
      return;
    }

    // Check if device is iOS (iPhone/iPad/iPod)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Check if dismissed before
    const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed');

    // Handle beforeinstallprompt on Chrome/Edge/Android
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS and not standalone and not dismissed, show banner after 2s
    if (isIosDevice && !isDismissed) {
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isStandalone || !showBanner) {
    return null;
  }

  return (
    <>
      {/* Floating Modern Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-gradient-to-r from-slate-900 to-blue-950 text-white p-4 rounded-2xl shadow-2xl border border-blue-500/30 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <Smartphone className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">
              ติดตั้งแอปลงมือถือ / คอมพิวเตอร์
            </p>
            <p className="text-[11px] text-blue-200 truncate">
              เปิดใช้งานได้ทันทีจากหน้าจอโฮม ไม่ต้องเปิดเว็บ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ติดตั้ง</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            title="ปิดข้อความ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Safari Instruction Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-800 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Smartphone className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                วิธีติดตั้งบน iPhone / iPad
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ทำตาม 2 ขั้นตอนง่ายๆ เพื่อเพิ่มแอปลงหน้าจอโฮม
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-800 flex items-center gap-1">
                    แตะปุ่มแชร์ <Share2 className="w-3.5 h-3.5 text-blue-600 inline" />
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    (แถบเมนูด้านล่างสุดของเบราว์เซอร์ Safari)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-800 flex items-center gap-1">
                    เลือก "เพิ่มไปยังหน้าจอโฮม" <PlusSquare className="w-3.5 h-3.5 text-blue-600 inline" />
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    (Add to Home Screen) แล้วกด "เพิ่ม (Add)"
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </>
  );
};
