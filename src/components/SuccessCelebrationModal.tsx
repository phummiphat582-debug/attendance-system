import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Building2, 
  Home, 
  Briefcase, 
  X
} from 'lucide-react';
import type { AttendanceRecord, UserProfile } from '../types/attendance';

interface SuccessCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'check_in' | 'check_out';
  employee: UserProfile;
  record: AttendanceRecord | null;
}

export const playSuccessChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Note 1 (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.3);

    // Note 2 (A5) slightly delayed
    setTimeout(() => {
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime);
        gain2.gain.setValueAtTime(0.15, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.4);
      } catch {}
    }, 120);
  } catch {}
};

export const SuccessCelebrationModal: React.FC<SuccessCelebrationModalProps> = ({
  isOpen,
  onClose,
  type,
  employee,
  record,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isOpen) {
      setProgress(100);
      return;
    }

    // Trigger Multi-stage Confetti
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });
    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
    }, 200);

    // Play pleasant chime sound
    playSuccessChime();

    // Auto-dismiss countdown (4.5s)
    const startTime = Date.now();
    const duration = 4500;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !record) return null;

  const isCheckIn = type === 'check_in';
  const timeStr = isCheckIn
    ? new Date(record.check_in_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : record.check_out_time
    ? new Date(record.check_out_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '-';

  const motivationalMessage = isCheckIn
    ? record.status === 'on_time'
      ? 'เข้างานตรงเวลาตามกำหนด ขอให้เป็นวันที่ราบรื่นและเต็มไปด้วยพลังบวกนะคะ ✨'
      : 'บันทึกเวลาเรียบร้อยแล้วค่ะ ตั้งใจทำงานและดูแลสุขภาพด้วยนะคะ 💪'
    : 'ลงเวลาออกงานเรียบร้อย ขอบคุณสำหรับความทุ่มเทในวันนี้ พักผ่อนให้เต็มที่นะคะ 🏠';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200/80 animate-in zoom-in-95 duration-200 relative">
        
        {/* Top Decorative Gradient Banner */}
        <div className={`h-28 relative overflow-hidden flex items-center justify-center ${
          isCheckIn
            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500'
            : 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500'
        }`}>
          {/* Animated decorative circles */}
          <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/20 rounded-full blur-xl animate-pulse pointer-events-none"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-xl animate-pulse pointer-events-none"></div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Banner Tag */}
          <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/25 backdrop-blur-md text-white text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isCheckIn ? 'ลงเวลาเข้างานสำเร็จ' : 'ลงเวลาออกงานสำเร็จ'}</span>
          </div>
        </div>

        {/* Employee Avatar (Centered overlapping banner) */}
        <div className="flex justify-center -mt-14 relative z-10">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-white p-0.5">
              <img
                src={employee.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${employee.full_name}`}
                alt={employee.full_name}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            {/* Status icon badge */}
            <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg border-2 border-white ${
              isCheckIn ? 'bg-emerald-600' : 'bg-rose-600'
            }`}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-center space-y-4">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {employee.full_name}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {employee.department}
            </p>
          </div>

          {/* Time Display Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>เวลาที่บันทึก ({isCheckIn ? 'เข้างาน' : 'ออกงาน'})</span>
            </div>
            <div className="text-3xl font-black font-mono tracking-tight text-slate-900">
              {timeStr} <span className="text-sm font-normal text-slate-500">น.</span>
            </div>

            {/* Badges */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                isCheckIn
                  ? record.status === 'on_time'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}>
                {isCheckIn ? (record.status === 'on_time' ? '🟢 ตรงเวลา' : '🟠 สาย') : '🚪 สิ้นสุดงานวันนี้'}
              </span>

              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-slate-700 border border-slate-200 flex items-center gap-1">
                {record.work_type === 'office' ? (
                  <><Building2 className="w-3.5 h-3.5 text-blue-600" /> ออฟฟิศ</>
                ) : record.work_type === 'wfh' ? (
                  <><Home className="w-3.5 h-3.5 text-indigo-600" /> WFH</>
                ) : (
                  <><Briefcase className="w-3.5 h-3.5 text-amber-600" /> ไซต์งาน</>
                )}
              </span>
            </div>
          </div>

          {/* Motivational Message */}
          <p className="text-xs text-slate-600 leading-relaxed px-4">
            {motivationalMessage}
          </p>

          {/* Action Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            ตกลง (รับทราบ)
          </button>
        </div>

        {/* Auto dismiss progress bar */}
        <div className="h-1 bg-slate-100 w-full overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ${
              isCheckIn ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>

      </div>
    </div>
  );
};
