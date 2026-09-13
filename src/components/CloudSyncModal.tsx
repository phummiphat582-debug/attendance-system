import React, { useState } from 'react';
import { X, Cloud, CheckCircle2, AlertCircle, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { attendanceService } from '../services/attendanceService';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChanged?: () => void;
}

const SQL_SETUP_SCRIPT = `-- ==============================================================================
-- PROTECH ATTENDANCE - SUPABASE REALTIME DATABASE SETUP
-- รันโค้ดชุดนี้ใน Supabase SQL Editor เพื่อเปิดใช้งานฐานข้อมูลแบบเรียลไทม์
-- ==============================================================================

-- 1. สร้างตารางบันทึกเวลาเข้างาน (Attendance Records)
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date DATE NOT NULL,
    check_in_time TIMESTAMPTZ NOT NULL,
    check_out_time TIMESTAMPTZ,
    work_type TEXT DEFAULT 'office',
    status TEXT DEFAULT 'on_time',
    check_in_note TEXT DEFAULT '',
    check_out_note TEXT DEFAULT '',
    location TEXT DEFAULT '',
    user_name TEXT,
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. สร้างตารางรายชื่อพนักงาน (Employees)
CREATE TABLE IF NOT EXISTS public.attendance_employees (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    department TEXT NOT NULL,
    role TEXT DEFAULT 'employee',
    email TEXT DEFAULT '',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. เปิดสิทธิ์การใช้งาน (RLS) เพื่อให้ทุกเครื่องเข้าถึงได้ทันที
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on attendance_records" ON public.attendance_records;
CREATE POLICY "Allow public all on attendance_records" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.attendance_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on attendance_employees" ON public.attendance_employees;
CREATE POLICY "Allow public all on attendance_employees" ON public.attendance_employees FOR ALL USING (true) WITH CHECK (true);

-- 4. เปิด Realtime สำหรับซิงค์ข้อมูลทุกเครื่องแบบเรียลไทม์
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_employees;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. บันทึกข้อมูลเริ่มต้น
INSERT INTO public.attendance_employees (id, full_name, department, email, avatar_url) VALUES
('emp-1', 'สมชาย สายลุย', 'ช่างเทคนิคภาคสนาม', 'somchai@protech.co.th', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'),
('emp-2', 'วิภาวรรณ มีสุข', 'ธุรการและประสานงาน', 'wipawan@protech.co.th', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'),
('emp-3', 'กิตติพงษ์ สิทธิศักดิ์', 'วิศวกรรมระบบ', 'kittipong@protech.co.th', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80'),
('emp-4', 'นันทิยา มั่นคง', 'ฝ่ายบริการลูกค้า', 'nantiya@protech.co.th', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;`;

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({ isOpen, onClose, onStatusChanged }) => {
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const isConnected = attendanceService.isRealtimeConnected();
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SETUP_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRecheck = async () => {
    setIsChecking(true);
    setMessage(null);
    try {
      const res = await attendanceService.recheckConnection();
      setMessage(res.message);
      if (onStatusChanged) onStatusChanged();
    } catch (e: any) {
      setMessage(e?.message || 'เกิดข้อผิดพลาดในการตรวจสอบ');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                ระบบฐานข้อมูลคลาวด์เรียลไทม์ (เห็นตรงกันทุกเครื่อง)
              </h3>
              <p className="text-xs text-slate-500">
                Supabase Realtime Database • ซิงค์สดทุกเสี้ยววินาที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Box */}
        <div className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
          isConnected
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/80 border-amber-200 text-amber-950'
        }`}>
          {isConnected ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">
              {isConnected
                ? '🟢 เชื่อมต่อคลาวด์เรียลไทม์สำเร็จ 100%'
                : '🟠 ยังไม่ได้รัน SQL เปิดตารางใน Supabase'}
            </p>
            <p className={isConnected ? 'text-emerald-700' : 'text-amber-800'}>
              {isConnected
                ? 'ระบบกำลังซิงค์ข้อมูลผ่าน Supabase Realtime ทุกครั้งที่มีคนลงเวลาจากมือถือหรือคอมพิวเตอร์ ข้อมูลจะเด้งแสดงผลบนทุกหน้าจอทันที!'
                : 'ขณะนี้ระบบบันทึกในเครื่องเฉพาะตัวอยู่ หากต้องการให้พนักงานทุกคนและหัวหน้าเห็นข้อมูลตรงกันแบบเรียลไทม์ ทำตามวิธี 10 วินาทีด้านล่างได้เลยครับ'}
            </p>
          </div>
        </div>

        {message && (
          <div className="text-xs p-3 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-medium">
            {message}
          </div>
        )}

        {/* Setup Steps */}
        {!isConnected && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-700">
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>⚡ วิธีเปิดใช้งานฐานข้อมูลเรียลไทม์ (ทำครั้งเดียว 10 วินาที):</span>
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
              <li>
                กดปุ่ม <strong>"คัดลอกโค้ด SQL"</strong> ด้านล่างนี้
              </li>
              <li>
                กดปุ่ม <strong>"เปิด Supabase SQL Editor"</strong> เพื่อไปยังหน้าคำสั่งของโปรเจกต์คุณ
              </li>
              <li>
                กดปุ่ม <strong>"Run"</strong> ใน Supabase เพื่อสร้างตาราง
              </li>
              <li>
                กลับมาหน้านี้ แล้วกด <strong>"ทดสอบและเชื่อมต่อทันที"</strong> ข้อมูลจะเริ่มซิงค์เรียลไทม์ทันที!
              </li>
            </ol>

            {/* SQL Code Preview Container */}
            <div className="relative mt-2">
              <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[10px] overflow-x-auto max-h-32 leading-relaxed">
                {SQL_SETUP_SCRIPT}
              </pre>
              <button
                type="button"
                onClick={handleCopySql}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] flex items-center gap-1 transition cursor-pointer backdrop-blur-xs"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? '✓ คัดลอกแล้ว!' : 'คัดลอก SQL'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          {!isConnected ? (
            <>
              <a
                href="https://supabase.com/dashboard/project/rimwhvvashgcaepyavjq/sql/new"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>เปิด Supabase SQL Editor</span>
              </a>

              <button
                type="button"
                disabled={isChecking}
                onClick={handleRecheck}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'กำลังตรวจสอบ...' : 'ทดสอบและเชื่อมต่อทันที'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto ml-auto px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
