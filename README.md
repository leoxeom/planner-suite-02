# Planner Suite 02

Gestion tout-en-un des **événements** et des **intermittents du spectacle** pour régisseurs, artistes, techniciens et administrateurs.

Cette version est la **refonte complète** du projet : passage de React/Vite à **Next.js 15 (App Router)**, nouveau schéma PostgreSQL sécurisé par **Supabase RLS**, design *Cyber Cristal Néon* et fonctionnalités étendues (feuilles de route, export PDF, notifications temps-réel…).

---

## Sommaire
1. [Technologies](#technologies)
2. [Pré-requis](#pré-requis)
3. [Installation](#installation)
4. [Configuration Supabase](#configuration-supabase)
5. [Structure du projet](#structure-du-projet)
6. [Fonctionnalités](#fonctionnalités)
7. [Guide de démarrage rapide](#guide-de-démarrage-rapide)
8. [Scripts disponibles](#scripts-disponibles)
9. [Contribuer](#contribuer)
10. [Licence](#licence)

---

## Technologies
| Couche | Outils / Librairies |
| ------ | ------------------ |
| Frontend | **Next.js 15** (App Router, Server Actions), **TypeScript**, **Tailwind CSS**, **Shadcn/ui**, **Zustand** |
| Backend | **Supabase** (PostgreSQL, Auth JWT, Realtime, Storage) |
| Infra & Dev Ops | **Vercel**, **Docker** (local db), **Supabase CLI**, **GitHub Actions** |
| Qualité | **ESLint**, **Prettier**, **Husky + lint-staged**, **Jest/Playwright** (tests) |

---

## Pré-requis
- Node.js >= 18  
- Supabase CLI >= 1.150  
- Docker Desktop (pour exécuter Supabase localement)  
- Compte Supabase si déploiement cloud  
- Vercel CLI (optionnel pour déploiement)

---

## Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/<org>/planner-suite-02.git
cd planner-suite-02

# 2. Copier les variables d'environnement
cp .env.local.example .env.local
# → Renseigner les clés Supabase & options

# 3. Installer les dépendances
npm install

# 4. Lancer Supabase en local (Docker)
supabase start

# 5. Appliquer le schéma + données de test
supabase db reset  # exécute toutes les migrations*
supabase db seed   # insère les données d'exemple

# 6. Démarrer l'application
npm run dev
```

\* Le fichier `supabase/migrations/20250110_complete_schema_reset.sql` crée **toute la base** (tables, RLS, triggers, index).

---

## Configuration Supabase

| Variable | Description |
| -------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre instance (ex. `https://xxxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique *anon* |
| `SUPABASE_SERVICE_ROLE_KEY` | (facultatif) clé *service_role* pour les scripts |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | Domaine pour le cookie JWT (`localhost` en dev) |

Options avancées : stockage, e-mails SMTP, clef d’export PDF… → voir `.env.local.example`.

### Politique RLS

Toutes les tables sont protégées. Les rôles (`regisseur`, `intermittent`, `admin`) sont stockés dans `public.profiles`. Les politiques sont définies directement dans la migration.

---

## Structure du projet

```
planner-suite-02/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Layout global + providers
│   ├── page.tsx            # Landing public
│   ├── auth/               # Routes d'authentification (login, register…)
│   └── dashboard/          # Espace protégé (regisseur, intermittent…)
├── lib/
│   ├── supabase/           # Client, provider, middleware helpers
│   └── theme/              # Gestion du thème (light/dark/system)
├── public/                 # Images & assets statiques
├── supabase/
│   ├── migrations/         # Schéma SQL, RLS, fonctions
│   └── seed.sql            # Données de test
├── styles/                 # (si fichiers Tailwind additionnels)
├── .env.local.example
├── next.config.mjs
└── package.json
```

---

## Fonctionnalités
- 🔐 **Authentification sécurisée** (JWT + refresh automatique, RLS)
- 📆 **Calendrier interactif** (React Big Calendar)  
- 👥 **Gestion des intermittents** : dispo, compétences, remplacements
- 🗂️ **Feuilles de route** multi-groupes (artistes / techniques / tous)
- 📄 **Export PDF / CSV / Excel** (Puppeteer)
- 🔔 **Notifications temps-réel** (Supabase Realtime)
- 🌙 **Thème adaptatif** : clair / sombre, animations *glass & neumorphism*
- 📈 **Statistiques tableau de bord** (événements, propositions, dispo)
- 🧪 **Tests unitaires & e2e** prêts (Jest + Playwright)

---

## Guide de démarrage rapide

1. Créez un projet Supabase ou lancez-le localement.  
2. Renseignez les variables `.env.local`.  
3. `npm run dev` → <http://localhost:3000>  
4. Connectez-vous avec les utilisateurs de démonstration (voir `supabase/seed.sql`).  
5. Explorez l’interface régisseur, créez des événements, testez les propositions.

---

## Scripts disponibles

| Commande | Usage |
| -------- | ----- |
| `npm run dev` | Lance le serveur Next.js en mode développement |
| `npm run build` | Build de production (Next.js standalone) |
| `npm start` | Démarre le build en production |
| `npm run lint` | Analyse ESLint + TypeScript |
| `npm run test` | Tests unitaires (Jest) |
| `npm run e2e` | Tests end-to-end (Playwright) |
| `supabase start` | Démarre Supabase localement (Docker) |
| `supabase db reset` | Recrée la BDD à partir des migrations |
| `supabase db seed` | Insère les données d'exemple |

---

## Contribuer

Nous accueillons volontiers vos **Issues** et **PR** !

1. Fork & clone le repo  
2. `git checkout -b feat/ma-fonctionnalite`  
3. Développez, **écrivez des tests**, assurez-vous que `npm run lint` passe  
4. Commits **Conventionnal Commits** (`feat: …`, `fix: …`)  
5. `git push` puis ouvrez une **Pull Request** détaillée  
6. La CI exécute lint, tests et *preview deploy* Vercel

> Besoin d’aide ? Consultez le dossier `docs/` (à venir) ou ouvrez une discussion.

---

## Licence
© 2025 – Planner Suite.  
Projet publié sous licence **MIT**.
