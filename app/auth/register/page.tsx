'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Calendar, ArrowRight, Loader2, Mail, Lock, User, Eye, EyeOff, UserCog } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'regisseur' | 'intermittent'>('intermittent');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
    fullName?: string;
  }>({});
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Vérification si déjà authentifié
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session && !error) {
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
              router.push('/');
          }
        } else {
          router.push('/');
        }
      }
    };
    
    checkAuth();
  }, [router, supabase]);

  // Validation des champs
  const validateForm = () => {
    const newErrors: typeof errors = {};
    let isValid = true;

    // Validation email
    if (!email.trim()) {
      newErrors.email = 'L\'email est requis';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Format d\'email invalide';
      isValid = false;
    }

    // Validation mot de passe
    if (!password) {
      newErrors.password = 'Le mot de passe est requis';
      isValid = false;
    } else if (password.length < 8) {
      newErrors.password = 'Le mot de passe doit contenir au moins 8 caractères';
      isValid = false;
    }

    // Validation confirmation mot de passe
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
      isValid = false;
    }

    // Validation nom complet
    if (!fullName.trim()) {
      newErrors.fullName = 'Le nom complet est requis';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Gestion de la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation du formulaire
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      // Préparation des données utilisateur pour le profil
      const userData = {
        full_name: fullName,
        role: role,
        username: email.split('@')[0], // Nom d'utilisateur par défaut basé sur l'email
      };

      // Inscription via Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) {
        console.error('Erreur d\'inscription:', error);
        
        // Messages d'erreur personnalisés
        if (error.message?.includes('email already registered')) {
          toast.error('Cet email est déjà utilisé');
        } else {
          toast.error(`Erreur d'inscription: ${error.message}`);
        }
        
        setIsLoading(false);
        return;
      }

      // Inscription réussie
      toast.success('Inscription réussie! Veuillez vérifier votre email pour confirmer votre compte.');
      
      // Redirection vers la page de confirmation
      router.push('/auth/verify-email?email=' + encodeURIComponent(email));
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
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className={`w-full pl-10 py-2 border ${errors.email ? 'border-destructive' : 'border-border'} rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary`}
                disabled={isLoading}
                required
              />
            </div>
            {errors.email && <p className="text-destructive text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Nom complet */}
          <div className="space-y-1">
            <label htmlFor="fullName" className="text-sm font-medium">
              Nom complet
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jean Dupont"
                className={`w-full pl-10 py-2 border ${errors.fullName ? 'border-destructive' : 'border-border'} rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary`}
                disabled={isLoading}
                required
              />
            </div>
            {errors.fullName && <p className="text-destructive text-xs mt-1">{errors.fullName}</p>}
          </div>

          {/* Rôle */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Rôle
            </label>
            <div className="relative flex items-center">
              <UserCog className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <div className="w-full pl-10 py-2 flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="intermittent"
                    checked={role === 'intermittent'}
                    onChange={() => setRole('intermittent')}
                    className="w-4 h-4 text-primary"
                    disabled={isLoading}
                  />
                  <span>Intermittent</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="regisseur"
                    checked={role === 'regisseur'}
                    onChange={() => setRole('regisseur')}
                    className="w-4 h-4 text-primary"
                    disabled={isLoading}
                  />
                  <span>Régisseur</span>
                </label>
              </div>
            </div>
          </div>

          {/* Mot de passe */}
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                className={`w-full pl-10 pr-10 py-2 border ${errors.password ? 'border-destructive' : 'border-border'} rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary`}
                disabled={isLoading}
                required
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
            {errors.password && <p className="text-destructive text-xs mt-1">{errors.password}</p>}
          </div>

          {/* Confirmation mot de passe */}
          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmez votre mot de passe"
                className={`w-full pl-10 pr-10 py-2 border ${errors.confirmPassword ? 'border-destructive' : 'border-border'} rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary`}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-destructive text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          {/* Bouton d'inscription */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all flex items-center justify-center hover-lift mt-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Inscription en cours...
              </>
            ) : (
              <>
                S'inscrire
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
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            En vous inscrivant, vous acceptez nos{' '}
            <Link href="/terms" className="text-primary hover:underline">
              Conditions d'utilisation
            </Link>{' '}
            et notre{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              Politique de confidentialité
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
