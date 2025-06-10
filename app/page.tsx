'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ArrowRight, Calendar, Users, FileText, CheckCircle, Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  
  // Vérification de l'authentification et redirection
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur lors de la vérification de la session:', error);
          setLoading(false);
          return;
        }
        
        if (session) {
          // Récupérer le profil pour déterminer le rôle
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
            
          if (profileError) {
            console.error('Erreur lors de la récupération du profil:', profileError);
            setLoading(false);
            return;
          }
          
          // Redirection selon le rôle
          switch (profile?.role) {
            case 'regisseur':
              router.push('/dashboard/regisseur');
              break;
            case 'intermittent':
              router.push('/dashboard/intermittent');
              break;
            case 'admin':
              router.push('/dashboard/admin');
              break;
            default:
              // Si le rôle n'est pas défini, rediriger vers la page de complétion du profil
              router.push('/auth/complete-profile');
          }
        } else {
          // Utilisateur non connecté
          setLoading(false);
        }
      } catch (error) {
        console.error('Erreur inattendue:', error);
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router, supabase]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse-slow">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent">
      {/* Header */}
      <header className="glass fixed top-0 w-full z-10 px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold neon-text">Planner Suite 02</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              href="/auth/login" 
              className="px-4 py-2 rounded-md hover:bg-accent/50 transition-all"
            >
              Connexion
            </Link>
            <Link 
              href="/auth/register" 
              className="px-4 py-2 rounded-md bg-primary text-white hover-lift"
            >
              Inscription
            </Link>
          </div>
        </div>
      </header>
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Simplifiez la gestion de vos <span className="text-primary neon-text">événements</span> et <span className="text-primary neon-text">intermittents</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Planifiez, organisez et gérez vos événements et votre personnel intermittent en toute simplicité avec notre solution complète.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link 
                  href="/auth/register" 
                  className="px-6 py-3 rounded-lg bg-primary text-white text-lg font-medium flex items-center justify-center hover-lift"
                >
                  Commencer gratuitement
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
                <Link 
                  href="#features" 
                  className="px-6 py-3 rounded-lg glass text-lg font-medium flex items-center justify-center hover-scale"
                >
                  Découvrir les fonctionnalités
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="neu-convex p-4 rounded-xl crystal">
                <div className="aspect-video rounded-lg bg-accent/30 flex items-center justify-center">
                  <Calendar className="w-16 h-16 text-primary/50" />
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 glass p-4 rounded-lg neon-border animate-float">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-medium">Planification simplifiée</span>
                </div>
              </div>
              <div className="absolute -top-6 -right-6 glass p-4 rounded-lg neon-border animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="font-medium">Feuilles de route</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-accent/20">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Fonctionnalités principales</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass p-6 rounded-xl hover-lift">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Gestion d'événements</h3>
              <p className="text-muted-foreground">
                Créez et gérez facilement tous vos événements avec un calendrier interactif et des outils de planification avancés.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="glass p-6 rounded-xl hover-lift">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Gestion des intermittents</h3>
              <p className="text-muted-foreground">
                Gérez vos intermittents, leurs disponibilités et leurs compétences avec notre système de proposition de dates intuitif.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="glass p-6 rounded-xl hover-lift">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Feuilles de route avancées</h3>
              <p className="text-muted-foreground">
                Créez des feuilles de route détaillées avec filtrage par groupes cibles (artistes/techniques) et export PDF.
              </p>
            </div>
            
            {/* Feature 4 */}
            <div className="glass p-6 rounded-xl hover-lift">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Validation des disponibilités</h3>
              <p className="text-muted-foreground">
                Système de proposition et validation des disponibilités avec détection automatique des conflits de planning.
              </p>
            </div>
            
            {/* Feature 5 */}
            <div className="glass p-6 rounded-xl hover-lift">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Interface moderne</h3>
              <p className="text-muted-foreground">
                Design Cyber Cristal Néon avec thème clair/sombre, animations fluides et interface adaptée mobile.
              </p>
            </div>
            
            {/* Feature 6 */}
            <div className="glass p-6 rounded-xl hover-lift">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-primary">
                  <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                  <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                  <path d="M9 17h6" />
                  <path d="M9 13h6" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Export multi-formats</h3>
              <p className="text-muted-foreground">
                Exportez vos plannings et feuilles de route en PDF, Excel ou CSV avec options de personnalisation avancées.
              </p>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <Link 
              href="/auth/register" 
              className="px-6 py-3 rounded-lg bg-primary text-white text-lg font-medium inline-flex items-center hover-lift"
            >
              Essayer maintenant
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">Planner Suite 02</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Planner Suite. Tous droits réservés.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
