-- supabase/seed.sql
-- Données de test pour Planner Suite 02

-- Désactiver temporairement les triggers RLS pour l'insertion des données
SET session_replication_role = 'replica';

-- Nettoyer les données existantes
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.event_participants CASCADE;
TRUNCATE TABLE public.date_proposals CASCADE;
TRUNCATE TABLE public.daily_schedules CASCADE;
TRUNCATE TABLE public.events CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- Constantes UUID pour faciliter les relations
\set regisseur_id '\'00000000-0000-4000-a000-000000000001\''
\set intermittent_artiste1_id '\'00000000-0000-4000-a000-000000000002\''
\set intermittent_artiste2_id '\'00000000-0000-4000-a000-000000000003\''
\set intermittent_technique1_id '\'00000000-0000-4000-a000-000000000004\''
\set intermittent_technique2_id '\'00000000-0000-4000-a000-000000000005\''
\set admin_id '\'00000000-0000-4000-a000-000000000006\''

\set event_draft_id '\'00000000-0000-4000-b000-000000000001\''
\set event_published_id '\'00000000-0000-4000-b000-000000000002\''
\set event_cancelled_id '\'00000000-0000-4000-b000-000000000003\''
\set event_completed_id '\'00000000-0000-4000-b000-000000000004\''

-- 1. Insertion des utilisateurs dans auth.users (simulation)
INSERT INTO auth.users (id, email, confirmed_at, created_at, updated_at)
VALUES 
    (:regisseur_id, 'regisseur@example.com', NOW(), NOW(), NOW()),
    (:intermittent_artiste1_id, 'artiste1@example.com', NOW(), NOW(), NOW()),
    (:intermittent_artiste2_id, 'artiste2@example.com', NOW(), NOW(), NOW()),
    (:intermittent_technique1_id, 'technique1@example.com', NOW(), NOW(), NOW()),
    (:intermittent_technique2_id, 'technique2@example.com', NOW(), NOW(), NOW()),
    (:admin_id, 'admin@example.com', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. Insertion des profils utilisateurs
INSERT INTO public.profiles (id, username, full_name, avatar_url, role, phone, bio, skills, availability_status)
VALUES
    -- Régisseur principal
    (:regisseur_id, 'regisseur_principal', 'Sophie Dupont', 'https://i.pravatar.cc/150?u=regisseur', 'regisseur', '+33612345678', 
    'Régisseuse générale avec 10 ans d''expérience dans l''organisation d''événements culturels.', 
    ARRAY['planification', 'budgétisation', 'coordination technique', 'gestion d''équipe'], 'available'),
    
    -- Intermittents artistes
    (:intermittent_artiste1_id, 'artiste_jean', 'Jean Lefebvre', 'https://i.pravatar.cc/150?u=artiste1', 'intermittent', '+33623456789', 
    'Comédien spécialisé dans le théâtre contemporain et l''improvisation.', 
    ARRAY['théâtre', 'improvisation', 'voix-off', 'animation'], 'available'),
    
    (:intermittent_artiste2_id, 'artiste_marie', 'Marie Leclerc', 'https://i.pravatar.cc/150?u=artiste2', 'intermittent', '+33634567890', 
    'Chanteuse et musicienne, spécialisée en jazz et musiques du monde.', 
    ARRAY['chant', 'piano', 'composition', 'direction chorale'], 'busy'),
    
    -- Intermittents techniques
    (:intermittent_technique1_id, 'tech_thomas', 'Thomas Martin', 'https://i.pravatar.cc/150?u=tech1', 'intermittent', '+33645678901', 
    'Technicien son avec expertise en sonorisation de concerts et d''événements live.', 
    ARRAY['sonorisation', 'mixage', 'enregistrement', 'régie son'], 'available'),
    
    (:intermittent_technique2_id, 'tech_lucie', 'Lucie Bernard', 'https://i.pravatar.cc/150?u=tech2', 'intermittent', '+33656789012', 
    'Technicienne lumière spécialisée dans la création d''ambiances pour spectacles vivants.', 
    ARRAY['éclairage', 'régie lumière', 'mapping vidéo', 'console grandMA'], 'unavailable'),
    
    -- Administrateur
    (:admin_id, 'admin_sys', 'Alexandre Admin', 'https://i.pravatar.cc/150?u=admin', 'admin', '+33667890123', 
    'Administrateur système et responsable de la plateforme.', 
    ARRAY['administration', 'gestion utilisateurs', 'support technique'], 'available');

-- 3. Création d'événements avec différents statuts
INSERT INTO public.events (id, title, description, status, target_group, start_date, end_date, location, budget, max_participants, created_by, version)
VALUES
    -- Événement brouillon (draft)
    (:event_draft_id, 'Festival de Jazz - Édition 2025', 
    'Préparation de l''édition 2025 du festival de jazz de la ville. Programmation en cours.', 
    'draft', 'both', '2025-07-15 14:00:00+02', '2025-07-20 23:00:00+02', 
    'Parc Municipal, Paris', 25000.00, 40, :regisseur_id, 1),
    
    -- Événement publié (published)
    (:event_published_id, 'Concert Symphonique - Mozart', 
    'Concert de l''orchestre philharmonique interprétant les œuvres de Mozart.', 
    'published', 'artistes', '2025-03-25 19:30:00+01', '2025-03-25 22:30:00+01', 
    'Salle Pleyel, Paris', 12000.00, 25, :regisseur_id, 2),
    
    -- Événement annulé (cancelled)
    (:event_cancelled_id, 'Spectacle de Danse Contemporaine', 
    'Représentation annulée pour cause de restrictions sanitaires.', 
    'cancelled', 'techniques', '2025-02-10 20:00:00+01', '2025-02-10 22:00:00+01', 
    'Théâtre de la Ville, Lyon', 8500.00, 15, :regisseur_id, 1),
    
    -- Événement terminé (completed)
    (:event_completed_id, 'Pièce de Théâtre "Les Misérables"', 
    'Adaptation moderne du chef-d''œuvre de Victor Hugo.', 
    'completed', 'both', '2025-01-05 20:00:00+01', '2025-01-15 22:30:00+01', 
    'Théâtre National, Marseille', 18000.00, 30, :regisseur_id, 3);

-- 4. Ajout de feuilles de route (daily_schedules)
INSERT INTO public.daily_schedules (event_id, schedule_date, start_time, end_time, title, description, target_groups, location, required_skills, max_participants, is_mandatory, responsible_person, created_by)
VALUES
    -- Pour l'événement publié (Concert Mozart)
    (:event_published_id, '2025-03-25', '09:00:00', '12:00:00', 'Installation et Balance', 
    'Installation des instruments et balance sonore pour le concert.', 
    ARRAY['techniques']::target_group[], 'Salle Pleyel - Scène principale', 
    ARRAY['sonorisation', 'régie son'], 8, true, 'Thomas Martin', :regisseur_id),
    
    (:event_published_id, '2025-03-25', '14:00:00', '16:00:00', 'Répétition Générale', 
    'Dernière répétition avant le concert du soir.', 
    ARRAY['artistes', 'techniques']::target_group[], 'Salle Pleyel - Scène principale', 
    ARRAY['direction d''orchestre', 'instruments à cordes', 'instruments à vent'], 25, true, 
    'Sophie Dupont', :regisseur_id),
    
    (:event_published_id, '2025-03-25', '18:00:00', '19:00:00', 'Préparation Artistes', 
    'Arrivée et préparation des musiciens.', 
    ARRAY['artistes']::target_group[], 'Salle Pleyel - Loges', 
    ARRAY['habillement', 'maquillage'], 25, true, 'Marie Leclerc', :regisseur_id),
    
    -- Pour l'événement brouillon (Festival de Jazz)
    (:event_draft_id, '2025-07-15', '08:00:00', '12:00:00', 'Montage Scène Principale', 
    'Installation de la scène principale et des équipements sonores.', 
    ARRAY['techniques']::target_group[], 'Parc Municipal - Zone A', 
    ARRAY['montage', 'sonorisation', 'éclairage'], 15, true, 'Lucie Bernard', :regisseur_id),
    
    (:event_draft_id, '2025-07-15', '14:00:00', '18:00:00', 'Soundcheck Artistes Jour 1', 
    'Tests sonores pour les artistes du premier jour.', 
    ARRAY['artistes', 'techniques']::target_group[], 'Parc Municipal - Scène principale', 
    ARRAY['sonorisation', 'instruments', 'réglages'], 20, true, 'Thomas Martin', :regisseur_id);

-- 5. Ajout de participations aux événements
INSERT INTO public.event_participants (event_id, user_id, status, role, notes)
VALUES
    -- Participations à l'événement publié (Concert Mozart)
    (:event_published_id, :intermittent_artiste1_id, 'confirmed', 'Narrateur', 
    'Rôle de narrateur pour les introductions des morceaux.'),
    
    (:event_published_id, :intermittent_artiste2_id, 'confirmed', 'Soliste Piano', 
    'Soliste pour le Concerto pour piano n°23.'),
    
    (:event_published_id, :intermittent_technique1_id, 'confirmed', 'Ingénieur Son', 
    'Responsable de la sonorisation générale.'),
    
    -- Participations à l'événement brouillon (Festival de Jazz)
    (:event_draft_id, :intermittent_technique1_id, 'invited', 'Ingénieur Son', 
    'Proposition pour la régie son principale du festival.'),
    
    (:event_draft_id, :intermittent_technique2_id, 'invited', 'Éclairagiste', 
    'Proposition pour la régie lumière du festival.'),
    
    -- Participations à l'événement terminé (Les Misérables)
    (:event_completed_id, :intermittent_artiste1_id, 'completed', 'Acteur Principal', 
    'Rôle de Jean Valjean - Performance exceptionnelle.'),
    
    (:event_completed_id, :intermittent_technique2_id, 'completed', 'Éclairagiste', 
    'Création lumière complète pour la pièce.');

-- 6. Ajout de propositions de dates
INSERT INTO public.date_proposals (event_id, proposed_by, proposed_date, alternative_dates, status, notes, reviewed_by, reviewed_at)
VALUES
    -- Propositions pour le Festival de Jazz
    (:event_draft_id, :intermittent_artiste1_id, '2025-07-16 20:00:00+02', 
    ARRAY['2025-07-17 20:00:00+02', '2025-07-18 19:00:00+02']::timestamptz[], 
    'pending', 'Disponible pour une performance solo ou en groupe ces jours-là.', NULL, NULL),
    
    (:event_draft_id, :intermittent_artiste2_id, '2025-07-17 21:00:00+02', 
    ARRAY['2025-07-18 21:00:00+02', '2025-07-19 20:00:00+02']::timestamptz[], 
    'accepted', 'Préférence pour le 17 juillet pour mon quartet jazz.', :regisseur_id, NOW()),
    
    (:event_draft_id, :intermittent_technique1_id, '2025-07-15 08:00:00+02', 
    ARRAY['2025-07-16 08:00:00+02']::timestamptz[], 
    'rejected', 'Disponible pour l''installation et les premiers jours uniquement.', :regisseur_id, NOW() - INTERVAL '2 days');

-- 7. Ajout de notifications
INSERT INTO public.notifications (user_id, type, title, content, is_read, related_entity_id)
VALUES
    -- Notifications pour le régisseur
    (:regisseur_id, 'proposal_response', 'Nouvelle proposition de date', 
    'Jean Lefebvre a proposé des dates pour le Festival de Jazz 2025.', false, :event_draft_id),
    
    (:regisseur_id, 'event_invite', 'Confirmations reçues', 
    '2 artistes et 1 technicien ont confirmé leur participation au Concert Mozart.', true, :event_published_id),
    
    -- Notifications pour les intermittents
    (:intermittent_artiste1_id, 'event_invite', 'Invitation à un événement', 
    'Vous avez été invité(e) à participer au Festival de Jazz 2025.', false, :event_draft_id),
    
    (:intermittent_artiste2_id, 'proposal_response', 'Proposition acceptée', 
    'Votre proposition de date pour le Festival de Jazz 2025 a été acceptée.', false, :event_draft_id),
    
    (:intermittent_technique1_id, 'proposal_response', 'Proposition refusée', 
    'Votre proposition de date pour le Festival de Jazz 2025 a été refusée.', true, :event_draft_id),
    
    (:intermittent_technique1_id, 'schedule_update', 'Mise à jour du planning', 
    'Le planning du Concert Mozart a été mis à jour. Veuillez consulter les nouveaux horaires.', false, :event_published_id);

-- Réactiver les triggers RLS
SET session_replication_role = 'origin';
