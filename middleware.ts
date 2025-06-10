import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase/client';

// Routes publiques qui ne nécessitent pas d'authentification
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/logout',
  '/auth/reset-password',
  '/auth/callback',
  '/api/auth/callback',
];

// Routes qui nécessitent un rôle spécifique
const roleRestrictedRoutes = {
  '/dashboard/regisseur': ['regisseur', 'admin'],
  '/dashboard/admin': ['admin'],
};

// Fonction pour vérifier si une URL correspond à un pattern
const matchesPattern = (url: string, pattern: string): boolean => {
  // Convertir le pattern en expression régulière
  // Par exemple, '/dashboard/regisseur' devient '^/dashboard/regisseur($|/.*)'
  const regexPattern = new RegExp(`^${pattern}($|/.*)`);
  return regexPattern.test(url);
};

// Middleware principal
export async function middleware(request: NextRequest) {
  // Créer une réponse par défaut
  const res = NextResponse.next();
  
  // Obtenir le chemin de l'URL
  const { pathname } = request.nextUrl;
  
  // Vérifier si c'est une route publique ou une ressource statique
  const isPublicRoute = publicRoutes.some(route => matchesPattern(pathname, route));
  const isStaticResource = /\.(jpg|jpeg|png|gif|svg|ico|css|js)$/i.test(pathname);
  
  // Si c'est une route publique ou une ressource statique, autoriser l'accès sans vérification
  if (isPublicRoute || isStaticResource) {
    return res;
  }
  
  // Créer le client Supabase pour le middleware
  const supabase = createMiddlewareSupabaseClient(request, res);
  
  // Vérifier la session
  const { data: { session }, error } = await supabase.auth.getSession();
  
  // Si pas de session ou erreur, rediriger vers la page de connexion
  if (!session || error) {
    const redirectUrl = new URL('/auth/login', request.url);
    // Ajouter l'URL de redirection après connexion
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  // Rafraîchir la session si proche de l'expiration
  if (session.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at;
    
    if ((expiresAt - now) < 300) { // 5 minutes avant expiration
      await supabase.auth.refreshSession();
    }
  }
  
  // Vérifier les restrictions de rôle pour certaines routes
  for (const [route, allowedRoles] of Object.entries(roleRestrictedRoutes)) {
    if (matchesPattern(pathname, route)) {
      // Récupérer le profil pour vérifier le rôle
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profileError || !profile || !allowedRoles.includes(profile.role)) {
        // Rediriger vers le tableau de bord approprié selon le rôle
        if (profile?.role === 'intermittent') {
          return NextResponse.redirect(new URL('/dashboard/intermittent', request.url));
        } else if (profile?.role === 'regisseur' && route === '/dashboard/admin') {
          return NextResponse.redirect(new URL('/dashboard/regisseur', request.url));
        } else {
          // Si le rôle n'est pas défini ou n'est pas autorisé, rediriger vers la page d'accueil
          return NextResponse.redirect(new URL('/', request.url));
        }
      }
    }
  }
  
  // Si tout est OK, continuer avec la requête
  return res;
}

// Configurer les chemins sur lesquels le middleware s'exécute
export const config = {
  // Exécuter le middleware sur toutes les routes sauf les ressources statiques
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/auth/* (auth API routes)
     * 2. /_next/* (Next.js internals)
     * 3. /_static/* (static files)
     * 4. /_vercel/* (Vercel internals)
     * 5. /favicon.ico, /sitemap.xml, /robots.txt (common static files)
     */
    '/((?!api/auth|_next|_static|_vercel|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
