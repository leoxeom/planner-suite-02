import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { SupabaseProvider } from '@/components/providers/supabase-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';

// Configuration de la police Inter avec sous-ensembles optimisés
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Métadonnées de l'application
export const metadata: Metadata = {
  title: {
    template: '%s | Planner Suite 02',
    default: 'Planner Suite 02 - Gestion d\'événements et d\'intermittents',
  },
  description: 'Plateforme de gestion d\'événements avec système de gestion des intermittents et feuilles de route avancées.',
  keywords: ['planification', 'événements', 'intermittents', 'régisseur', 'feuille de route'],
  authors: [{ name: 'Planner Suite Team' }],
  creator: 'Planner Suite Team',
  publisher: 'Planner Suite',
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
};

// Configuration de la vue mobile
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
  ],
};

// Layout principal de l'application
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head />
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SupabaseProvider>
            <div className="flex min-h-screen flex-col bg-background text-foreground">
              <main className="flex-1">
                {children}
              </main>
            </div>
            <Toaster position="top-right" />
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
