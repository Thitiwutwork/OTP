-- ==========================================================
-- NAME STORE - Supabase Database Schema
-- สคริปต์ SQL สำหรับสร้างตารางและตั้งค่าระบบรับ OTP
-- สามารถคัดลอกทั้งหมดนี้ไปวางในหน้า Supabase SQL Editor แล้วกด Run ได้ทันที
-- ==========================================================

-- 1. เปิด Extension สำหรับสร้าง UUID อัตโนมัติ
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================================
-- 2. สร้างตาราง domains (รายชื่อโดเมนที่เชื่อมต่อในระบบ)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    source TEXT DEFAULT 'Cloudflare',
    status TEXT DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- 3. สร้างตาราง mailboxes (กล่องข้อความ / บัญชีเมล)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.mailboxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
    address TEXT UNIQUE NOT NULL,
    pin_code VARCHAR(10),
    note TEXT,
    filter_type TEXT DEFAULT 'all',
    custom_filter TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- 4. สร้างตาราง emails (อีเมลที่ได้รับและรหัส OTP)
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mailbox_id UUID REFERENCES public.mailboxes(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    sender TEXT NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    otp_code VARCHAR(20),
    received_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- 5. สร้าง Index เพื่อเพิ่มความเร็วในการค้นหาอีเมลและ OTP
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_mailboxes_address ON public.mailboxes(address);
CREATE INDEX IF NOT EXISTS idx_emails_mailbox_id ON public.emails(mailbox_id);
CREATE INDEX IF NOT EXISTS idx_emails_recipient ON public.emails(recipient);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON public.emails(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_otp_code ON public.emails(otp_code);

-- ==========================================================
-- 6. เปิดใช้งาน Realtime สำหรับรับอีเมลเข้าใหม่ทันทีโดยไม่ต้องรีเฟรช
-- ==========================================================
ALTER TABLE public.emails REPLICA IDENTITY FULL;
ALTER TABLE public.mailboxes REPLICA IDENTITY FULL;

-- เพิ่มตารางเข้าระบบ Realtime Publication ของ Supabase
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'emails'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'mailboxes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.mailboxes;
    END IF;
END $$;

-- ==========================================================
-- 7. ตั้งค่าความปลอดภัย Row Level Security (RLS)
-- อนุญาตให้อ่านและเขียนข้อมูลผ่าน API ของระบบ
-- ==========================================================
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mailboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- นโยบาย RLS สำหรับ domains
CREATE POLICY "Public read domains" ON public.domains FOR SELECT USING (true);
CREATE POLICY "Public insert domains" ON public.domains FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update domains" ON public.domains FOR UPDATE USING (true);
CREATE POLICY "Public delete domains" ON public.domains FOR DELETE USING (true);

-- นโยบาย RLS สำหรับ mailboxes
CREATE POLICY "Public read mailboxes" ON public.mailboxes FOR SELECT USING (true);
CREATE POLICY "Public insert mailboxes" ON public.mailboxes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update mailboxes" ON public.mailboxes FOR UPDATE USING (true);
CREATE POLICY "Public delete mailboxes" ON public.mailboxes FOR DELETE USING (true);

-- นโยบาย RLS สำหรับ emails
CREATE POLICY "Public read emails" ON public.emails FOR SELECT USING (true);
CREATE POLICY "Public insert emails" ON public.emails FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update emails" ON public.emails FOR UPDATE USING (true);
CREATE POLICY "Public delete emails" ON public.emails FOR DELETE USING (true);

-- ==========================================================
-- 8. เพิ่มโดเมนเริ่มต้น namenoname.store
-- ==========================================================
INSERT INTO public.domains (name, source, status, is_active)
VALUES ('namenoname.store', 'Cloudflare', 'active', true)
ON CONFLICT (name) DO NOTHING;
