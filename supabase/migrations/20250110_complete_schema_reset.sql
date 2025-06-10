-- supabase/migrations/20250110_complete_schema_reset.sql
-- Réinitialisation complète du schéma Planner Suite 02

-- Suppression des tables existantes si elles existent (ordre inverse des dépendances)
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.date_proposals CASCADE;
DROP TABLE IF EXISTS public.daily_schedules CASCADE;
DROP TABLE IF EXISTS public.event_participants CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Suppression des types ENUM existants
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.availability_status CASCADE;
DROP TYPE IF EXISTS public.event_status CASCADE;
DROP TYPE IF EXISTS public.proposal_status CASCADE;
DROP TYPE IF EXISTS public.target_group CASCADE;
DROP TYPE IF EXISTS public.participation_status CASCADE;
DROP TYPE IF EXISTS public.notification_type CASCADE;

-- Suppression des fonctions existantes
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.can_delete_event(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.delete_user_profile_complete(UUID) CASCADE;

-- Création des types ENUM
CREATE TYPE user_role AS ENUM ('regisseur', 'intermittent', 'admin');
CREATE TYPE availability_status AS ENUM ('available', 'busy', 'unavailable');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE proposal_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE target_group AS ENUM ('artistes', 'techniques', 'both');
CREATE TYPE participation_status AS ENUM ('invited', 'confirmed', 'declined', 'assigned', 'completed');
CREATE TYPE notification_type AS ENUM ('event_invite', 'schedule_update', 'proposal_response', 'general');

-- Table des profils utilisateur
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    role user_role DEFAULT 'intermittent'::user_role NOT NULL,
    phone VARCHAR(20),
    bio TEXT,
    skills TEXT[],
    availability_status availability_status DEFAULT 'available'::availability_status,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des événements
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status event_status DEFAULT 'draft'::event_status NOT NULL,
    target_group target_group DEFAULT 'both'::target_group NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    location VARCHAR(255),
    budget DECIMAL(10,2),
    max_participants INTEGER,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    version INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    
    CONSTRAINT valid_date_range CHECK (end_date >= start_date),
    CONSTRAINT positive_budget CHECK (budget >= 0),
    CONSTRAINT positive_participants CHECK (max_participants > 0)
);

-- Table des participants aux événements
CREATE TABLE public.event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status participation_status DEFAULT 'invited'::participation_status NOT NULL,
    role VARCHAR(100),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(event_id, user_id)
);

-- Table des feuilles de route (planning journalier)
CREATE TABLE public.daily_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_groups target_group[] DEFAULT '{both}',
    location VARCHAR(255),
    required_skills TEXT[],
    max_participants INTEGER,
    is_mandatory BOOLEAN DEFAULT false,
    responsible_person VARCHAR(255),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(event_id, schedule_date, start_time),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Table des propositions de dates
CREATE TABLE public.date_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    proposed_by UUID REFERENCES auth.users(id) NOT NULL,
    proposed_date TIMESTAMPTZ NOT NULL,
    alternative_dates TIMESTAMPTZ[],
    status proposal_status DEFAULT 'pending'::proposal_status,
    notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    is_read BOOLEAN DEFAULT false,
    related_entity_id UUID,
    related_entity_type VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Triggers pour updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.event_participants
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.daily_schedules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.date_proposals
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Fonction pour créer un profil après inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fonction pour vérification des permissions de suppression
CREATE OR REPLACE FUNCTION can_delete_event(event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM events 
    WHERE id = event_id 
    AND (
      created_by = auth.uid() OR 
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'admin'
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour suppression complète d'un profil utilisateur
CREATE OR REPLACE FUNCTION delete_user_profile_complete(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Suppression des données liées en ordre
  DELETE FROM notifications WHERE user_id = delete_user_profile_complete.user_id;
  DELETE FROM date_proposals WHERE proposed_by = delete_user_profile_complete.user_id;
  DELETE FROM event_participants WHERE user_id = delete_user_profile_complete.user_id;
  DELETE FROM profiles WHERE id = delete_user_profile_complete.user_id;
  
  RETURN FOUND;
EXCEPTION 
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies pour profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Policies pour events avec gestion des brouillons
CREATE POLICY "Users can view published events or own events" ON public.events
    FOR SELECT USING (
        status = 'published' OR 
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.event_participants 
            WHERE event_id = id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Regisseurs can create events" ON public.events
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role IN ('regisseur', 'admin')
        )
    );

CREATE POLICY "Event creators can update their events" ON public.events
    FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Event creators can delete their draft events" ON public.events
    FOR DELETE TO authenticated USING (
        created_by = auth.uid() AND status = 'draft'
    );

-- Policies pour event_participants
CREATE POLICY "Event creators can manage participants" ON public.event_participants
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Users can view their participations" ON public.event_participants
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their participation status" ON public.event_participants
    FOR UPDATE TO authenticated USING (
        user_id = auth.uid()
    ) WITH CHECK (
        user_id = auth.uid() AND 
        (NEW.status = 'confirmed' OR NEW.status = 'declined')
    );

-- Policies pour daily_schedules
CREATE POLICY "Users can view schedules of their events" ON public.daily_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.event_participants
            WHERE event_id = daily_schedules.event_id AND user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = daily_schedules.event_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Event creators can manage schedules" ON public.daily_schedules
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_id AND created_by = auth.uid()
        )
    );

-- Policies pour date_proposals
CREATE POLICY "Users can create date proposals" ON public.date_proposals
    FOR INSERT TO authenticated WITH CHECK (proposed_by = auth.uid());

CREATE POLICY "Users can view their proposals" ON public.date_proposals
    FOR SELECT USING (proposed_by = auth.uid());

CREATE POLICY "Event creators can view proposals for their events" ON public.date_proposals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_id AND created_by = auth.uid()
        )
    );

CREATE POLICY "Event creators can update proposal status" ON public.date_proposals
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_id AND created_by = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE id = event_id AND created_by = auth.uid()
        )
    );

-- Policies pour notifications
CREATE POLICY "Users can only view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update read status of their notifications" ON public.notifications
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Index essentiels pour performance
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_dates ON public.events(start_date, end_date);
CREATE INDEX idx_events_creator ON public.events(created_by);
CREATE INDEX idx_daily_schedules_event_date ON public.daily_schedules(event_id, schedule_date);
CREATE INDEX idx_event_participants_event ON public.event_participants(event_id);
CREATE INDEX idx_event_participants_user ON public.event_participants(user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, is_read);

-- Index pour recherche textuelle
CREATE INDEX idx_events_search ON public.events USING gin(to_tsvector('french', title || ' ' || COALESCE(description, '')));
CREATE INDEX idx_profiles_search ON public.profiles USING gin(to_tsvector('french', full_name || ' ' || COALESCE(username, '') || ' ' || COALESCE(bio, '')));
