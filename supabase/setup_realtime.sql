-- ==============================================================================
-- PROTECH ATTENDANCE - SUPABASE REALTIME DATABASE SETUP
-- รันโค้ดชุดนี้ใน Supabase SQL Editor เพื่อเปิดใช้งานฐานข้อมูลแบบเรียลไทม์ (ทุกเครื่องเห็นพร้อมกันทันที)
-- ลิงก์ตรง: https://supabase.com/dashboard/project/hrglhnddjbxxmlhbeysm/sql/new
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

-- 3. เปิดความปลอดภัย Row Level Security (RLS) พร้อมอนุญาตให้พนักงานทุกคนใช้งานได้ทันที
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on attendance_records" ON public.attendance_records;
CREATE POLICY "Allow public all on attendance_records" ON public.attendance_records FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.attendance_employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on attendance_employees" ON public.attendance_employees;
CREATE POLICY "Allow public all on attendance_employees" ON public.attendance_employees FOR ALL USING (true) WITH CHECK (true);

-- 4. เปิดระบบ Realtime สำหรับทั้ง 2 ตาราง (เพื่อให้ข้อมูลเด้งอัปเดตทุกหน้าจอทันทีที่มีคนลงเวลา)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_employees;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. เพิ่มรายชื่อพนักงานเริ่มต้น (ถ้ายังไม่มี)
INSERT INTO public.attendance_employees (id, full_name, department, email, avatar_url) VALUES
('emp-1', 'สมชาย สายลุย', 'ช่างเทคนิคภาคสนาม', 'somchai@protech.co.th', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'),
('emp-2', 'วิภาวรรณ มีสุข', 'ธุรการและประสานงาน', 'wipawan@protech.co.th', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'),
('emp-3', 'กิตติพงษ์ สิทธิศักดิ์', 'วิศวกรรมระบบ', 'kittipong@protech.co.th', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80'),
('emp-4', 'นันทิยา มั่นคง', 'ฝ่ายบริการลูกค้า', 'nantiya@protech.co.th', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;
