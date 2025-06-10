'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentSupabase } from '@/lib/supabase/client-browser';
import { Calendar, ArrowRight, Users, FileText } from 'lucide-react';

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const supabase = createClientComponentSupabase();

  useEffect(() => {
    const checkUser = async () => {
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
            
          if (!profileError && profile) {
            // Redirection selon le rôle
            switch (profile.role) {
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
                router.push('/dashboard');
            }
          } else {
            router.push('/dashboard');
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Erreur inattendue:', error);
        setLoading(false);
      }
    };
    
    checkUser();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col items-center">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
          <Calendar className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6">
          Planner Suite <span className="text-primary">02</span>
        </h1>
        <p className="text-xl text-center text-muted-foreground max-w-2xl mb-10">
          Simplifiez la gestion de vos événements et de votre personnel intermittent avec notre solution complète.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/auth/login"
            className="px-6 py-3 bg-primary text-white rounded-lg hover-lift flex items-center justify-center"
          >
            Se connecter
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <Link 
            href="/auth/register"
            className="px-6 py-3 bg-accent/50 text-foreground rounded-lg hover:bg-accent/70 flex items-center justify-center"
          >
            Créer un compte
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Fonctionnalités principales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="glass p-6 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Planification d'événements</h3>
            <p className="text-muted-foreground">
              Créez et gérez facilement vos événements avec notre calendrier interactif et nos outils de planification avancés.
            </p>
          </div>
          
          {/* Feature 2 */}
          <div className="glass p-6 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Gestion des intermittents</h3>
            <p className="text-muted-foreground">
              Gérez efficacement votre personnel intermittent, leurs disponibilités et leurs compétences pour une organisation optimale.
            </p>
          </div>
          
          {/* Feature 3 */}
          <div className="glass p-6 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Feuilles de route</h3>
            <p className="text-muted-foreground">
              Générez des feuilles de route détaillées pour chaque événement et partagez-les facilement avec votre équipe.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-border mt-16">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Planner Suite 02. Tous droits réservés.
            </p>
          </div>
          <div className="flex space-x-4">
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Conditions d'utilisation
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Politique de confidentialité
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
