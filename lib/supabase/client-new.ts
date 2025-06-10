/**
 * lib/supabase/client-new.ts
 * Configuration des clients Supabase pour Next.js 15 avec App Router
 * Utilise directement @supabase/supabase-js sans les auth helpers
 */

import { createClient } from '@supabase/supabase-js';
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
export const COOKIE_NAME = 'planner-suite-02-auth';
export const COOKIE_OPTIONS = {
  name: COOKIE_NAME,
  maxAge: 60 * 60 * 24 * 7, // 7 jours en secondes
  path: '/',
  sameSite: 'lax' as const,
  domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
  secure: process.env.NODE_ENV === 'production',
  httpOnly: true,
};

// Fonction utilitaire pour obtenir les cookies de session
export function getSessionCookies() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    return sessionCookie ? { [COOKIE_NAME]: sessionCookie.value } : {};
  } catch (error) {
    // En cas d'erreur (par exemple, si cookies() est appelé dans un contexte client)
    return {};
  }
}

// Client Supabase pour utilisation directe (sans auth)
export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Client pour composants côté client (browser)
export function createClientComponentSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
}

// Client pour composants serveur (avec mise en cache)
export const createServerComponentSupabase = cache(() => {
  const cookieData = getSessionCookies();
  
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        cookies: {
          get(name: string) {
            return cookieData[name];
          },
        },
      },
    }
  );
});

// Client pour Server Actions
export function createServerActionSupabase() {
  const cookieData = getSessionCookies();
  
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        cookies: {
          get(name: string) {
            return cookieData[name];
          },
          set(name: string, value: string, options: any) {
            cookies().set(name, value, options);
          },
          remove(name: string, options: any) {
            cookies().delete({ name, ...options });
          },
        },
      },
    }
  );
}

// Client pour middleware
export function createMiddlewareSupabase(req: NextRequest) {
  // Extraire le cookie de session de la requête
  const cookieValue = req.cookies.get(COOKIE_NAME)?.value;
  
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        cookies: {
          get(name: string) {
            if (name === COOKIE_NAME) {
              return cookieValue;
            }
            return '';
          },
        },
      },
    }
  );
}

// Fonction pour mettre à jour la session dans le middleware
export async function updateSession(req: NextRequest) {
  const res = NextResponse.next();
  const supabaseClient = createMiddlewareSupabase(req);
  
  // Vérifier si la session existe
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  
  if (error) {
    console.error('Erreur lors de la récupération de la session:', error);
    return res;
  }
  
  // Refresh automatique si proche expiration
  if (session?.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    
    if ((expiresAt - now) < 300) { // 5 minutes avant expiration
      const { data: refreshData, error: refreshError } = await supabaseClient.auth.refreshSession();
      
      if (refreshError) {
        console.error('Erreur lors du rafraîchissement de la session:', refreshError);
      } else if (refreshData.session) {
        // Mettre à jour le cookie avec la nouvelle session
        const sessionCookie = refreshData.session.access_token;
        if (sessionCookie) {
          res.cookies.set(COOKIE_NAME, sessionCookie, COOKIE_OPTIONS);
        }
      }
    }
  }
  
  return res;
}

// Fonction utilitaire pour obtenir le profil utilisateur
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    return null;
  }
  
  return data;
}

// Fonction pour vérifier l'authentification et rediriger si nécessaire
export async function checkAuth(supabaseClient: ReturnType<typeof createServerComponentSupabase>) {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  
  if (error || !session) {
    return { isAuthenticated: false, profile: null };
  }
  
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
    
  return { 
    isAuthenticated: true, 
    profile, 
    user: session.user 
  };
}
