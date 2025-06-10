'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { createClientComponentSupabase } from '@/lib/supabase/client-browser';
import { Calendar, ArrowRight, Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'regisseur' | 'intermittent'>('intermittent');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const supabase = createClientComponentSupabase();

  // Vérification si déjà authentifié
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session && !error) {
        router.push(redirectTo);
      }
    };
    
    checkAuth();
  }, [router, redirectTo, supabase]);

  // Gestion de la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation basique
      if (!email.trim() || !password.trim() || !username.trim()) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        toast.error('Les mots de passe ne correspondent pas');
        setIsLoading(false);
        return;
      }

      if (password.length < 8) {
        toast.error('Le mot de passe doit contenir au moins 8 caractères');
        setIsLoading(false);
        return;
      }

      // Vérifier si l'email existe déjà
      const { data: existingUsers, error: emailCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .limit(1);

      if (emailCheckError) {
        console.error('Erreur lors de la vérification du nom d\'utilisateur:', emailCheckError);
        toast.error('Erreur lors de la vérification du nom d\'utilisateur');
        setIsLoading(false);
        return;
      }

      if (existingUsers && existingUsers.length > 0) {
        toast.error('Ce nom d\'utilisateur est déjà utilisé');
        setIsLoading(false);
        return;
      }

      // Inscription
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            role,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('Erreur d\'inscription:', error);
        
        // Messages d'erreur personnalisés
        if (error.message?.includes('email already')) {
          toast.error('Cet email est déjà utilisé');
        } else {
          toast.error(`Erreur d'inscription: ${error.message}`);
        }
        
        setIsLoading(false);
        return;
      }

      // Création du profil utilisateur
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              username,
              role,
              availability_status: 'available',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);

        if (profileError) {
          console.error('Erreur lors de la création du profil:', profileError);
          toast.error('Erreur lors de la création du profil');
          
          // Supprimer l'utilisateur si la création du profil échoue
          await supabase.auth.admin.deleteUser(data.user.id);
          
          setIsLoading(false);
          return;
        }
      }

      // Inscription réussie
      toast.success('Inscription réussie! Veuillez vérifier votre email pour confirmer votre compte.');
      router.push('/auth/login');
    } catch (error: any) {
      console.error('Erreur inattendue:', error);
      toast.error('Une erreur inattendue est survenue');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent p-4">
      <div className="glass w-full max-w-md p-8 rounded-xl shadow-lg">
        {/* En-tête */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Créer un compte</h1>
          <p className="text-muted-foreground mt-2 text-center">
            Rejoignez Planner Suite 02 pour gérer vos événements
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom d'utilisateur */}
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-medium">
              Nom d'utilisateur <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="votre_nom"
                className="w-full pl-10 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full pl-10 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum 8 caractères
            </p>
          </div>

          {/* Confirmation mot de passe */}
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirmer le mot de passe <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Choix du rôle */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Je suis <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('regisseur')}
                className={`py-2 px-4 rounded-md border ${
                  role === 'regisseur'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background/50 border-border hover:bg-accent/30'
                } transition-all flex items-center justify-center`}
                disabled={isLoading}
              >
                Régisseur
              </button>
              <button
                type="button"
                onClick={() => setRole('intermittent')}
                className={`py-2 px-4 rounded-md border ${
                  role === 'intermittent'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-background/50 border-border hover:bg-accent/30'
                } transition-all flex items-center justify-center`}
                disabled={isLoading}
              >
                Intermittent
              </button>
            </div>
          </div>

          {/* Bouton d'inscription */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all flex items-center justify-center hover-lift"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Inscription en cours...
              </>
            ) : (
              <>
                Créer un compte
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Lien de connexion */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Vous avez déjà un compte?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

        {/* Conditions d'utilisation */}
        <div className="mt-6 text-xs text-center text-muted-foreground">
          En créant un compte, vous acceptez nos{' '}
          <Link href="/terms" className="text-primary hover:underline">
            Conditions d'utilisation
          </Link>{' '}
          et notre{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Politique de confidentialité
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
