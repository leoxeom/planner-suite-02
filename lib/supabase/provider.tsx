'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  type Session, 
  type User, 
  type SupabaseClient 
} from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { Database } from '@/lib/supabase/client';
import { createClientComponentSupabase } from '@/lib/supabase/client-browser';

// Types pour le contexte d'authentification
type SupabaseContextType = {
  supabase: SupabaseClient<Database>;
  session: Session | null;
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
  executeAuthOperation: <T>(operation: () => Promise<T>) => Promise<T>;
};

// Création du contexte
const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

// Provider Supabase
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  const router = useRouter();
  const supabase = createClientComponentSupabase();
  
  // Fonction pour rafraîchir la session
  const refreshSession = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Erreur lors du rafraîchissement de la session:', error);
        return;
      }
      
      if (data.session) {
        setSession(data.session);
        setUser(data.session.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement de la session:', error);
    }
  };
  
  // Fonction pour récupérer le profil utilisateur
  const fetchUserProfile = async (userId: string) => {
    try {
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
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      return null;
    }
  };
  
  // Initialisation de l'état d'authentification
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      
      try {
        // Récupérer la session actuelle
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur lors de la récupération de la session:', error);
          setIsLoading(false);
          return;
        }
        
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          setIsAuthenticated(true);
          
          // Récupérer le profil utilisateur
          const userProfile = await fetchUserProfile(currentSession.user.id);
          setProfile(userProfile);
        }
      } catch (error) {
        console.error('Erreur inattendue:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();
    
    // Configurer les écouteurs d'événements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (event === 'SIGNED_IN' && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          setIsAuthenticated(true);
          
          // Récupérer le profil utilisateur
          const userProfile = await fetchUserProfile(currentSession.user.id);
          setProfile(userProfile);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsAuthenticated(false);
        } else if (event === 'TOKEN_REFRESHED' && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          setIsAuthenticated(true);
        }
      }
    );
    
    // Nettoyer l'écouteur
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);
  
  // Fonction pour exécuter des opérations authentifiées avec retry automatique
  const executeAuthOperation = async <T,>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation();
    } catch (error: any) {
      // Si l'erreur est liée à un JWT expiré, rafraîchir la session et réessayer
      if (error.message && (
          error.message.includes('JWT') || 
          error.message.includes('token') || 
          error.code === 'PGRST301'
        )) {
        await refreshSession();
        
        try {
          return await operation();
        } catch (retryError: any) {
          console.error('Erreur après tentative de rafraîchissement:', retryError);
          toast.error('Votre session a expiré. Veuillez vous reconnecter.');
          router.push('/auth/login');
          throw retryError;
        }
      }
      
      throw error;
    }
  };
  
  // Valeur du contexte
  const value: SupabaseContextType = {
    supabase,
    session,
    user,
    profile,
    isLoading,
    isAuthenticated,
    refreshSession,
    executeAuthOperation,
  };
  
  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

// Hook pour accéder au contexte Supabase
export function useSupabase() {
  const context = useContext(SupabaseContext);
  
  if (context === undefined) {
    throw new Error('useSupabase doit être utilisé à l\'intérieur d\'un SupabaseProvider');
  }
  
  return context;
}

// Alias pour compatibilité avec le code existant
export const useAuth = useSupabase;
