// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Mode ESM par défaut avec l'extension .mjs
  
  // Optimisations d'images
  images: {
    domains: [
      'i.pravatar.cc', // Pour les avatars de test
      'avatars.githubusercontent.com', // Pour les avatars GitHub
      'lh3.googleusercontent.com', // Pour les avatars Google
      'pbs.twimg.com', // Pour les avatars Twitter
    ],
    // Support des images depuis Supabase Storage
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/**',
      },
    ],
  },
  
  // Configuration pour la production
  output: 'standalone', // Mode standalone pour déploiement optimisé
  
  // Optimisations de performance
  swcMinify: true, // Utiliser SWC pour la minification
  reactStrictMode: true, // Mode strict React pour détecter les problèmes potentiels
  
  // Configuration des redirections pour l'authentification
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/login',
        permanent: true,
      },
      {
        source: '/register',
        destination: '/auth/register',
        permanent: true,
      },
      {
        source: '/logout',
        destination: '/auth/logout',
        permanent: true,
      },
    ];
  },
  
  // Configuration des en-têtes de sécurité
  async headers() {
    return [
      {
        // S'applique à toutes les routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Configuration des variables d'environnement exposées au client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  
  // Configuration expérimentale pour Next.js 15
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // Limite pour les Server Actions
    },
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'zustand',
    ],
  },
};

export default nextConfig;
