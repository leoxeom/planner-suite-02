/**
 * lib/supabase/client.ts
 * Configuration des clients Supabase pour Next.js 15
 */

import { createClient } from '@supabase/supabase-js';
import { 
  createClientComponentClient,
  createServerComponentClient,
  createRouteHandlerClient,
  createMiddlewareClient,
  type CookieOptions
} from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { cache } from 'react';

// Types pour les tables de la base de données
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          role: 'regisseur' | 'intermittent' | 'admin';
          phone: string | null;
          bio: string | null;
          skills: string[] | null;
          availability_status: 'available' | 'busy' | 'unavailable';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'regisseur' | 'intermittent' | 'admin';
          phone?: string | null;
          bio?: string | null;
          skills?: string[] | null;
          availability_status?: 'available' | 'busy' | 'unavailable';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: 'regisseur' | 'intermittent' | 'admin';
          phone?: string | null;
          bio?: string | null;
          skills?: string[] | null;
          availability_status?: 'available' | 'busy' | 'unavailable';
          created_at?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: 'draft' | 'published' | 'cancelled' | 'completed';
          target_group: 'artistes' | 'techniques' | 'both';
          start_date: string;
          end_date: string;
          location: string | null;
          budget: number | null;
          max_participants: number | null;
          created_by: string;
          version: number;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: 'draft' | 'published' | 'cancelled' | 'completed';
          target_group?: 'artistes' | 'techniques' | 'both';
          start_date: string;
          end_date: string;
          location?: string | null;
          budget?: number | null;
          max_participants?: number | null;
          created_by: string;
          version?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: 'draft' | 'published' | 'cancelled' | 'completed';
          target_group?: 'artistes' | 'techniques' | 'both';
          start_date?: string;
          end_date?: string;
          location?: string | null;
          budget?: number | null;
          max_participants?: number | null;
          created_by?: string;
          version?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
      };
      event_participants: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          status: 'invited' | 'confirmed' | 'declined' | 'assigned' | 'completed';
          role: string | null;
          invited_at: string;
          responded_at: string | null;
          notes: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          hourly_rate?: number | null;
          total_hours?: number | null;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          status?: 'invited' | 'confirmed' | 'declined' | 'assigned' | 'completed';
          role?: string | null;
          invited_at?: string;
          responded_at?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          hourly_rate?: number | null;
          total_hours?: number | null;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          status?: 'invited' | 'confirmed' | 'declined' | 'assigned' | 'completed';
          role?: string | null;
          invited_at?: string;
          responded_at?: string | null;
          notes?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          hourly_rate?: number | null;
          total_hours?: number | null;
        };
      };
      daily_schedules: {
        Row: {
          id: string;
          event_id: string;
          schedule_date: string;
          start_time: string;
          end_time: string;
          title: string;
          description: string | null;
          target_groups: ('artistes' | 'techniques' | 'both')[];
          location: string | null;
          required_skills: string[] | null;
          max_participants: number | null;
          is_mandatory: boolean;
          responsible_person: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          schedule_date: string;
          start_time: string;
          end_time: string;
          title: string;
          description?: string | null;
          target_groups?: ('artistes' | 'techniques' | 'both')[];
          location?: string | null;
          required_skills?: string[] | null;
          max_participants?: number | null;
          is_mandatory?: boolean;
          responsible_person?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          schedule_date?: string;
          start_time?: string;
          end_time?: string;
          title?: string;
          description?: string | null;
          target_groups?: ('artistes' | 'techniques' | 'both')[];
          location?: string | null;
          required_skills?: string[] | null;
          max_participants?: number | null;
          is_mandatory?: boolean;
          responsible_person?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      date_proposals: {
        Row: {
          id: string;
          event_id: string;
          proposed_by: string;
          proposed_date: string;
          alternative_dates: string[] | null;
          status: 'pending' | 'accepted' | 'rejected';
          notes: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          proposed_by: string;
          proposed_date: string;
          alternative_dates?: string[] | null;
          status?: 'pending' | 'accepted' | 'rejected';
          notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          proposed_by?: string;
          proposed_date?: string;
          alternative_dates?: string[] | null;
          status?: 'pending' | 'accepted' | 'rejected';
          notes?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'event_invite' | 'schedule_update' | 'proposal_response' | 'general';
          title: string;
          message?: string | null;
          is_read: boolean;
          related_id?: string | null;
          related_type?: string | null;
          created_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'event_invite' | 'schedule_update' | 'proposal_response' | 'general';
          title: string;
          message?: string | null;
          is_read?: boolean;
          related_id?: string | null;
          related_type?: string | null;
          created_at?: string;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'event_invite' | 'schedule_update' | 'proposal_response' | 'general';
          title?: string;
          message?: string | null;
          is_read?: boolean;
          related_id?: string | null;
          related_type?: string | null;
          created_at?: string;
          metadata?: Json | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_delete_event: {
        Args: { event_id: string };
        Returns: boolean;
      };
      delete_user_profile_complete: {
        Args: { user_id: string };
        Returns: boolean;
      };
      handle_new_user: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      handle_updated_at: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: {
      user_role: 'regisseur' | 'intermittent' | 'admin';
      availability_status: 'available' | 'busy' | 'unavailable';
      event_status: 'draft' | 'published' | 'cancelled' | 'completed';
      proposal_status: 'pending' | 'accepted' | 'rejected';
      target_group: 'artistes' | 'techniques' | 'both';
      participation_status: 'invited' | 'confirmed' | 'declined' | 'assigned' | 'completed';
      notification_type: 'event_invite' | 'schedule_update' | 'proposal_response' | 'general';
    };
  };
};

// Vérification des variables d'environnement
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL est manquant dans les variables d\'environnement');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY est manquant dans les variables d\'environnement');
}

// Configuration des options de cookies
export const cookieOptions: CookieOptions = {
  name: 'planner-suite-02-auth',
  lifetime: 60 * 60 * 24 * 7, // 7 jours
  domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
  path: '/',
  sameSite: 'lax',
};

// Client Supabase pour utilisation directe (sans auth helpers)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Client pour composants côté client (browser)
export const createClient = createClientComponentClient<Database>;

// Client pour composants serveur (avec mise en cache)
export const createServerClient = cache(() => {
  const cookieStore = cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore }, { cookieOptions });
});

// Client pour API routes
export function createApiClient() {
  const cookieStore = cookies();
  return createRouteHandlerClient<Database>({ cookies: () => cookieStore }, { cookieOptions });
}

// Client pour middleware
export function createMiddlewareSupabaseClient(
  req: NextRequest,
  res: NextResponse
) {
  return createMiddlewareClient<Database>({ req, res }, { cookieOptions });
}

// Fonction pour mettre à jour la session dans le middleware
export async function updateSession(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient(req, res);
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  // Refresh automatique si proche expiration
  if (session?.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    
    if ((expiresAt - now) < 300) { // 5 minutes avant expiration
      await supabase.auth.refreshSession();
    }
  }
  
  return res;
}
