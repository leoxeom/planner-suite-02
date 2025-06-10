'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// Types pour le thème
type Theme = 'dark' | 'light' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  attribute?: string;
  disableTransitionOnChange?: boolean;
};

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'dark' | 'light';
  systemTheme: 'dark' | 'light';
  themes: Theme[];
};

// Création du contexte
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provider du thème
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  enableSystem = true,
  attribute = 'class',
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('light');
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('light');
  const [mounted, setMounted] = useState(false);
  
  // Liste des thèmes disponibles
  const themes: Theme[] = enableSystem 
    ? ['light', 'dark', 'system'] 
    : ['light', 'dark'];

  // Fonction pour définir le thème
  const setTheme = (theme: Theme) => {
    setThemeState(theme);
    
    // Sauvegarder le thème dans localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
  };

  // Appliquer le thème au document
  const applyTheme = (theme: 'dark' | 'light') => {
    const root = document.documentElement;
    
    // Désactiver les transitions pendant le changement de thème si demandé
    if (disableTransitionOnChange) {
      document.documentElement.classList.add('disable-transitions');
    }
    
    if (attribute === 'class') {
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else {
      root.setAttribute(attribute, theme);
    }
    
    // Réactiver les transitions après le changement
    if (disableTransitionOnChange) {
      window.setTimeout(() => {
        document.documentElement.classList.remove('disable-transitions');
      }, 0);
    }
  };

  // Détecter le thème système
  const detectSystemTheme = () => {
    if (typeof window !== 'undefined') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDark ? 'dark' : 'light';
    }
    return 'light';
  };

  // Résoudre le thème actuel (prendre en compte le thème système si nécessaire)
  const resolveTheme = (theme: Theme, systemTheme: 'dark' | 'light') => {
    return theme === 'system' ? systemTheme : theme;
  };

  // Effet pour initialiser le thème au montage du composant
  useEffect(() => {
    // Ajouter du CSS pour les transitions fluides
    if (!disableTransitionOnChange) {
      const style = document.createElement('style');
      style.appendChild(
        document.createTextNode(
          `* {
            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease !important;
          }
          .disable-transitions * {
            transition: none !important;
          }`
        )
      );
      document.head.appendChild(style);
    }

    // Détecter le thème système initial
    const initialSystemTheme = detectSystemTheme();
    setSystemTheme(initialSystemTheme);

    // Récupérer le thème sauvegardé dans localStorage
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme && themes.includes(savedTheme)) {
      setThemeState(savedTheme);
    }

    // Résoudre et appliquer le thème
    const currentTheme = savedTheme || defaultTheme;
    const resolved = resolveTheme(currentTheme, initialSystemTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    // Configurer l'écouteur pour les changements de préférence système
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const newSystemTheme = detectSystemTheme();
      setSystemTheme(newSystemTheme);
      
      if (theme === 'system') {
        setResolvedTheme(newSystemTheme);
        applyTheme(newSystemTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    setMounted(true);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Effet pour appliquer le thème lorsqu'il change
  useEffect(() => {
    if (mounted) {
      const resolved = resolveTheme(theme, systemTheme);
      setResolvedTheme(resolved);
      applyTheme(resolved);
    }
  }, [theme, systemTheme, mounted]);

  // Valeur du contexte
  const contextValue: ThemeContextType = {
    theme,
    setTheme,
    resolvedTheme,
    systemTheme,
    themes
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook pour accéder au contexte du thème
export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme doit être utilisé à l\'intérieur d\'un ThemeProvider');
  }
  
  return context;
}
