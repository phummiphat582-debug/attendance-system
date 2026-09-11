-- ==============================================================================
-- SUPABASE DATABASE SCHEMA: Attendance System (ระบบลงเวลางาน)
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('employee', 'manager', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE work_type AS ENUM ('office', 'wfh', 'onsite');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('on_time', 'late', 'pending', 'absent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Linked with Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'employee'::user_role NOT NULL,
    department TEXT DEFAULT 'Engineering',
    github_username TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    check_out_time TIMESTAMP WITH TIME ZONE,
    work_type work_type DEFAULT 'office'::work_type NOT NULL,
    check_in_note TEXT,
    check_out_note TEXT,
    status attendance_status DEFAULT 'on_time'::attendance_status NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure an employee can only have one attendance record per calendar date
    CONSTRAINT unique_user_date UNIQUE (user_id, date)
);

-- Index for speedy queries on daily attendance & supervisor reports
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance_records(status);

-- 5. SYSTEM & NOTIFICATION SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name TEXT DEFAULT 'ทีมงานของเรา' NOT NULL,
    work_start_time TIME DEFAULT '09:00:00' NOT NULL,
    late_threshold_minutes INTEGER DEFAULT 15 NOT NULL,
    notify_webhook_url TEXT DEFAULT '',
    notify_provider TEXT DEFAULT 'discord' NOT NULL, -- 'discord', 'telegram', 'line'
    notify_on_checkin BOOLEAN DEFAULT TRUE NOT NULL,
    notify_on_checkout BOOLEAN DEFAULT TRUE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default system settings row if none exists
INSERT INTO public.company_settings (company_name, work_start_time, late_threshold_minutes, notify_webhook_url, notify_provider)
SELECT 'ทีมงานของเรา', '09:00:00', 15, '', 'discord'
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- 6. AUTOMATIC PROFILE CREATION TRIGGER (On auth.users insert via GitHub or Email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, github_username, role, department)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'user_name',
            split_part(NEW.email, '@', 1)
        ),
        COALESCE(
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'picture',
            'https://api.dicebear.com/7.x/bottts/svg?seed=' || NEW.id
        ),
        COALESCE(NEW.raw_user_meta_data->>'user_name', NEW.raw_user_meta_data->>'preferred_username', NULL),
        -- First user gets 'admin' or 'manager', others default to 'employee'
        CASE 
            WHEN (SELECT COUNT(*) FROM public.profiles) = 0 THEN 'admin'::user_role
            ELSE 'employee'::user_role
        END,
        'Engineering'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Attendance Policies
CREATE POLICY "Users can view their own attendance records"
    ON public.attendance_records FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('manager', 'admin')
        )
    );

CREATE POLICY "Users can insert their own attendance record"
    ON public.attendance_records FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own attendance record for today"
    ON public.attendance_records FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('manager', 'admin')
        )
    );

-- Company Settings Policies
CREATE POLICY "Company settings are viewable by all authenticated users"
    ON public.company_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Only managers and admins can update company settings"
    ON public.company_settings FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('manager', 'admin')
        )
    );

-- 8. ENABLE REALTIME ON ATTENDANCE RECORDS (For live supervisor dashboard updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ==============================================================================
-- DONE!
-- ==============================================================================
