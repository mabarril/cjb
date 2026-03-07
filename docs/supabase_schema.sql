-- 1. Create Custom Types (Enums)
CREATE TYPE voice_part_type AS ENUM ('Soprano', 'Contralto', 'Tenor', 'Baixo', 'Regência');
CREATE TYPE user_role_type AS ENUM ('corista', 'admin');
CREATE TYPE user_status_type AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE session_status_type AS ENUM ('agendado', 'ativo', 'finalizado');
CREATE TYPE attendance_status_type AS ENUM ('presente', 'ausente', 'atrasado');

-- 2. Create Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    voice_part voice_part_type,
    role user_role_type DEFAULT 'corista',
    status user_status_type DEFAULT 'pending',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Sessions Table (Ensaios / Eventos)
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    location TEXT NOT NULL,
    status session_status_type DEFAULT 'agendado',
    end_at TIMESTAMPTZ, -- Optional end time for the rehearsal
    qr_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Attendances Table (Presenças)
CREATE TABLE IF NOT EXISTS public.attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    status attendance_status_type DEFAULT 'presente',
    UNIQUE(session_id, user_id) -- A user can only register once per session
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- PROFILES
-- Anyone authenticated can view profiles (needed for lists/admin checks)
CREATE POLICY "Authenticated users can view profiles" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() IS NOT NULL);

-- Users can insert their own profile on signup
CREATE POLICY "Users can insert their own profile" 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Users can update their own profile, but maybe only certain fields
CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Admins can update any profile (e.g., to change status to 'approved')
CREATE POLICY "Admins can update all profiles" 
    ON public.profiles FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- SESSIONS
-- Anyone authenticated can view sessions
CREATE POLICY "Authenticated users can view sessions" 
    ON public.sessions FOR SELECT 
    USING (auth.uid() IS NOT NULL);

-- Only admins can manage sessions (Insert, Update, Delete)
CREATE POLICY "Admins can manage sessions" 
    ON public.sessions FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- ATTENDANCES
-- Users can view their own attendances
CREATE POLICY "Users can view own attendances" 
    ON public.attendances FOR SELECT 
    USING (auth.uid() = user_id);

-- Admins can view all attendances
CREATE POLICY "Admins can view all attendances" 
    ON public.attendances FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Users can insert an attendance (register presence) only if their profile status is 'approved'
CREATE POLICY "Approved users can register attendance" 
    ON public.attendances FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.status = 'approved'
        )
    );

-- Admins can manage attendances (update status e.g., mark as absent or late manually)
CREATE POLICY "Admins can manage attendances" 
    ON public.attendances FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 7. Realtime configuration
-- Enable realtime for sessions, attendances and profiles
alter publication supabase_realtime add table public.sessions;
alter publication supabase_realtime add table public.attendances;
alter publication supabase_realtime add table public.profiles;

-- 8. Storage Configuration (Avatars)
-- Create the bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy to allow public access to see avatars
CREATE POLICY "Avatares públicos" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'avatars');

-- Policy to allow users to upload their own avatars
-- The file name starts with the user ID or matches the user ID pattern
CREATE POLICY "Usuários podem subir seus próprios avatares" ON storage.objects
FOR INSERT TO authenticated 
WITH CHECK (
  bucket_id = 'avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text OR 
  name LIKE auth.uid()::text || '-%'
);
