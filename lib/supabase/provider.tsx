'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  createClientComponentClient, 
  type Session, 
  type User, 
  type SupabaseClient 
} from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';
import { Database } from '@/lib/supabase/client';

// Types pour le contexte d'authentification
type AuthContextType = {
  user: User | null;
  profile: any | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any, data: any }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateProfile: (data: any) => Promise<{ error: any }>;
  supabase: SupabaseClient<Database>;
};

// Création du contexte
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Temps avant expiration pour déclencher un refresh (5 minutes)
const REFRESH_THRESHOLD_SECONDS = 300;

// Provider d'authentification
export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  
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
      console.error('Erreur inattendue lors du rafraîchissement de la session:', error);
    }
  };
  
  // Fonction pour vérifier si la session doit être rafraîchie
  const checkSessionRefresh = (currentSession: Session) => {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = currentSession.expires_at;
    
    // Si la session expire dans moins de REFRESH_THRESHOLD_SECONDS, la rafraîchir
    if (expiresAt && (expiresAt - now) < REFRESH_THRESHOLD_SECONDS) {
      refreshSession();
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
      console.error('Erreur inattendue lors de la récupération du profil:', error);
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
          
          // Vérifier si la session doit être rafraîchie
          checkSessionRefresh(currentSession);
        }
      } catch (error) {
        console.error('Erreur inattendue lors de l\'initialisation de l\'authentification:', error);
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
        } else if (event === 'USER_UPDATED' && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          
          // Mettre à jour le profil utilisateur
          const userProfile = await fetchUserProfile(currentSession.user.id);
          setProfile(userProfile);
        }
      }
    );
    
    // Configurer un intervalle pour vérifier régulièrement si la session doit être rafraîchie
    const refreshInterval = setInterval(() => {
      if (session) {
        checkSessionRefresh(session);
      }
    }, 60000); // Vérifier toutes les minutes
    
    // Nettoyer les écouteurs et l'intervalle
    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [supabase]);
  
  // Fonction de connexion
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { error };
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return { error };
    }
  };
  
  // Fonction d'inscription
  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });
      
      return { data, error };
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      return { data: null, error };
    }
  };
  
  // Fonction de déconnexion
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };
  
  // Fonction de mise à jour du profil
  const updateProfile = async (data: any) => {
    try {
      if (!user) {
        return { error: new Error('Utilisateur non connecté') };
      }
      
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);
        
      if (!error) {
        // Mettre à jour le profil dans l'état
        setProfile({ ...profile, ...data });
      }
      
      return { error };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      return { error };
    }
  };
  
  // Valeur du contexte
  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    refreshSession,
    updateProfile,
    supabase,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personnalisé pour accéder au contexte d'authentification
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un SupabaseProvider');
  }
  
  return context;
}

// Hook pour les opérations authentifiées avec retry automatique
export function useAuthenticatedOperation() {
  const { refreshSession, isAuthenticated, supabase } = useAuth();
  const router = useRouter();
  
  const executeOperation = async (operation: () => Promise<any>) => {
    try {
      // Si l'utilisateur n'est pas authentifié, rediriger vers la page de connexion
      if (!isAuthenticated) {
        router.push('/auth/login');
        return { error: 'Non authentifié' };
      }
      
      // Essayer d'exécuter l'opération
      return await operation();
    } catch (error: any) {
      // Si l'erreur est liée à un JWT expiré, rafraîchir la session et réessayer
      if (error.message && (
          error.message.includes('JWT') || 
          error.message.includes('token') || 
          error.code === 'PGRST301'
        )) {
        await refreshSession();
        
        // Réessayer l'opération après le rafraîchissement
        try {
          return await operation();
        } catch (retryError) {
          console.error('Erreur après tentative de rafraîchissement:', retryError);
          toast.error('Votre session a expiré. Veuillez vous reconnecter.');
          router.push('/auth/login');
          return { error: retryError };
        }
      }
      
      // Pour les autres erreurs, les propager
      throw error;
    }
  };
  
  return { executeOperation };
}
