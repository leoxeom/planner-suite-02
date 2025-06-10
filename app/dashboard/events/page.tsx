'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/components/providers/supabase-provider';
import { toast } from 'react-hot-toast';
import { format, parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  Search,
  Filter,
  Grid,
  List,
  Edit,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  X,
} from 'lucide-react';

// Types pour les filtres et les événements
type FilterOptions = {
  status: string[];
  targetGroup: string[];
  startDate: string | null;
  endDate: string | null;
  search: string;
  page: number;
  perPage: number;
  sortBy: 'start_date' | 'title' | 'created_at';
  sortOrder: 'asc' | 'desc';
};

type Event = {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  target_group: 'artistes' | 'techniques' | 'both';
  start_date: string;
  end_date: string;
  location: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  participantCount?: number;
};

export default function EventsPage() {
  const { supabase, profile, executeAuthOperation } = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // États pour les événements et le chargement
  const [events, setEvents] = useState<Event[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // État pour les filtres
  const [filters, setFilters] = useState<FilterOptions>({
    status: [],
    targetGroup: [],
    startDate: null,
    endDate: null,
    search: '',
    page: 1,
    perPage: 10,
    sortBy: 'start_date',
    sortOrder: 'desc',
  });
  
  // Initialiser les filtres à partir des paramètres d'URL
  useEffect(() => {
    const status = searchParams.get('status');
    const targetGroup = searchParams.get('targetGroup');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = searchParams.get('page');
    const sortBy = searchParams.get('sortBy') as FilterOptions['sortBy'] | null;
    const sortOrder = searchParams.get('sortOrder') as FilterOptions['sortOrder'] | null;
    
    setFilters(prev => ({
      ...prev,
      status: status ? status.split(',') : [],
      targetGroup: targetGroup ? targetGroup.split(',') : [],
      startDate: startDate || null,
      endDate: endDate || null,
      search: search || '',
      page: page ? parseInt(page) : 1,
      sortBy: sortBy || 'start_date',
      sortOrder: sortOrder || 'desc',
    }));
  }, [searchParams]);
  
  // Fonction pour charger les événements
  const loadEvents = async () => {
    setIsLoading(true);
    try {
      await executeAuthOperation(async () => {
        // Construire la requête de base
        let query = supabase
          .from('events')
          .select('*, event_participants(count)', { count: 'exact' });
        
        // Appliquer les filtres
        if (filters.status.length > 0) {
          query = query.in('status', filters.status);
        }
        
        if (filters.targetGroup.length > 0) {
          query = query.in('target_group', filters.targetGroup);
        }
        
        if (filters.startDate) {
          query = query.gte('start_date', filters.startDate);
        }
        
        if (filters.endDate) {
          query = query.lte('end_date', filters.endDate);
        }
        
        if (filters.search) {
          query = query.ilike('title', `%${filters.search}%`);
        }
        
        // Si l'utilisateur est un intermittent, ne montrer que les événements publiés
        // ou les événements auxquels il est invité
        if (profile?.role === 'intermittent') {
          query = query.or(`status.eq.published,id.in.(${
            supabase
              .from('event_participants')
              .select('event_id')
              .eq('user_id', profile.id)
              .then(({ data }) => data?.map(p => p.event_id).join(',') || '')
          })`);
        }
        
        // Appliquer le tri
        query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });
        
        // Appliquer la pagination
        const from = (filters.page - 1) * filters.perPage;
        const to = from + filters.perPage - 1;
        query = query.range(from, to);
        
        // Exécuter la requête
        const { data, error, count } = await query;
        
        if (error) throw error;
        
        // Formater les événements avec le nombre de participants
        const formattedEvents = data.map(event => ({
          ...event,
          participantCount: event.event_participants?.[0]?.count || 0
        }));
        
        setEvents(formattedEvents);
        setTotalEvents(count || 0);
      });
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Charger les événements lorsque les filtres changent
  useEffect(() => {
    loadEvents();
  }, [filters]);
  
  // Fonction pour mettre à jour les filtres
  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };
  
  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      status: [],
      targetGroup: [],
      startDate: null,
      endDate: null,
      search: '',
      page: 1,
      perPage: 10,
      sortBy: 'start_date',
      sortOrder: 'desc',
    });
  };
  
  // Fonction pour publier/dépublier un événement
  const toggleEventStatus = async (eventId: string, currentStatus: string) => {
    try {
      setIsLoading(true);
      
      // Vérifier si l'utilisateur est un régisseur ou un admin
      if (profile?.role !== 'regisseur' && profile?.role !== 'admin') {
        toast.error('Vous n\'avez pas les permissions nécessaires');
        return;
      }
      
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      const publishedAt = newStatus === 'published' ? new Date().toISOString() : null;
      
      const { error } = await supabase
        .from('events')
        .update({ 
          status: newStatus,
          published_at: publishedAt
        })
        .eq('id', eventId);
      
      if (error) throw error;
      
      toast.success(`Événement ${newStatus === 'published' ? 'publié' : 'dépublié'} avec succès`);
      
      // Recharger les événements
      loadEvents();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour dupliquer un événement
  const duplicateEvent = async (eventId: string) => {
    try {
      setIsLoading(true);
      
      // Vérifier si l'utilisateur est un régisseur ou un admin
      if (profile?.role !== 'regisseur' && profile?.role !== 'admin') {
        toast.error('Vous n\'avez pas les permissions nécessaires');
        return;
      }
      
      // Récupérer l'événement à dupliquer
      const { data: eventToDuplicate, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Créer un nouvel événement avec les mêmes données
      const { data: newEvent, error: createError } = await supabase
        .from('events')
        .insert({
          ...eventToDuplicate,
          id: undefined, // Laisser la base de données générer un nouvel ID
          title: `Copie de ${eventToDuplicate.title}`,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          published_at: null,
          created_by: profile.id
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      toast.success('Événement dupliqué avec succès');
      
      // Recharger les événements
      loadEvents();
    } catch (error) {
      console.error('Erreur lors de la duplication:', error);
      toast.error('Erreur lors de la duplication');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour supprimer un événement
  const deleteEvent = async (eventId: string) => {
    try {
      setIsLoading(true);
      
      // Vérifier si l'utilisateur est un régisseur ou un admin
      if (profile?.role !== 'regisseur' && profile?.role !== 'admin') {
        toast.error('Vous n\'avez pas les permissions nécessaires');
        return;
      }
      
      // Confirmer la suppression
      if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.')) {
        setIsLoading(false);
        return;
      }
      
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
      
      toast.success('Événement supprimé avec succès');
      
      // Recharger les événements
      loadEvents();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Calculer le nombre total de pages
  const totalPages = Math.ceil(totalEvents / filters.perPage);
  
  // Fonction pour changer de page
  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setFilters(prev => ({ ...prev, page: newPage }));
  };
  
  // Fonction pour obtenir la classe de statut
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };
  
  // Fonction pour obtenir le libellé du statut
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Brouillon';
      case 'published':
        return 'Publié';
      case 'cancelled':
        return 'Annulé';
      case 'completed':
        return 'Terminé';
      default:
        return status;
    }
  };
  
  // Fonction pour obtenir le libellé du groupe cible
  const getTargetGroupLabel = (targetGroup: string) => {
    switch (targetGroup) {
      case 'artistes':
        return 'Artistes';
      case 'techniques':
        return 'Techniques';
      case 'both':
        return 'Tous';
      default:
        return targetGroup;
    }
  };
  
  // Fonction pour obtenir l'icône du groupe cible
  const getTargetGroupIcon = (targetGroup: string) => {
    switch (targetGroup) {
      case 'artistes':
        return <Users className="w-4 h-4" />;
      case 'techniques':
        return <FileText className="w-4 h-4" />;
      case 'both':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };
  
  // Fonction pour vérifier si un événement est à venir, en cours ou passé
  const getEventTimeStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (isBefore(now, start)) {
      return { status: 'upcoming', label: 'À venir', className: 'text-amber-600 dark:text-amber-400' };
    } else if (isAfter(now, end)) {
      return { status: 'past', label: 'Passé', className: 'text-slate-600 dark:text-slate-400' };
    } else {
      return { status: 'current', label: 'En cours', className: 'text-green-600 dark:text-green-400' };
    }
  };
  
  // Rendu de la page
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent p-4 md:p-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Événements</h1>
          <p className="text-muted-foreground mt-1">
            Gérez tous vos événements en un seul endroit
          </p>
        </div>
        {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
          <Link 
            href="/dashboard/events/new" 
            className="mt-4 md:mt-0 flex items-center px-4 py-2 bg-primary text-white rounded-lg hover-lift"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouvel événement
          </Link>
        )}
      </div>
      
      {/* Barre de recherche et filtres */}
      <div className="glass p-4 rounded-xl mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Recherche */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un événement..."
              value={filters.search}
              onChange={e => updateFilters({ search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          {/* Bouton filtres */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="px-4 py-2 flex items-center justify-center bg-accent/50 rounded-md hover:bg-accent/70 transition-all"
          >
            <Filter className="w-5 h-5 mr-2" />
            Filtres
            {(filters.status.length > 0 || filters.targetGroup.length > 0 || filters.startDate || filters.endDate) && (
              <span className="ml-2 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                {filters.status.length + filters.targetGroup.length + (filters.startDate ? 1 : 0) + (filters.endDate ? 1 : 0)}
              </span>
            )}
          </button>
          
          {/* Bouton vue */}
          <div className="flex rounded-md overflow-hidden border border-border">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 flex items-center ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-accent/50'}`}
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 flex items-center ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-accent/50'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Panneau de filtres */}
        {isFilterOpen && (
          <div className="mt-4 p-4 border border-border rounded-lg bg-background/50">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Filtres par statut */}
              <div className="flex-1">
                <h3 className="font-medium mb-2">Statut</h3>
                <div className="flex flex-wrap gap-2">
                  {['draft', 'published', 'cancelled', 'completed'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        if (filters.status.includes(status)) {
                          updateFilters({ status: filters.status.filter(s => s !== status) });
                        } else {
                          updateFilters({ status: [...filters.status, status] });
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm ${
                        filters.status.includes(status)
                          ? getStatusClass(status)
                          : 'bg-accent/30 hover:bg-accent/50'
                      }`}
                    >
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Filtres par groupe cible */}
              <div className="flex-1">
                <h3 className="font-medium mb-2">Groupe cible</h3>
                <div className="flex flex-wrap gap-2">
                  {['artistes', 'techniques', 'both'].map(group => (
                    <button
                      key={group}
                      onClick={() => {
                        if (filters.targetGroup.includes(group)) {
                          updateFilters({ targetGroup: filters.targetGroup.filter(g => g !== group) });
                        } else {
                          updateFilters({ targetGroup: [...filters.targetGroup, group] });
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm flex items-center ${
                        filters.targetGroup.includes(group)
                          ? 'bg-primary/20 text-primary'
                          : 'bg-accent/30 hover:bg-accent/50'
                      }`}
                    >
                      {getTargetGroupIcon(group)}
                      <span className="ml-1">{getTargetGroupLabel(group)}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Filtres par date */}
              <div className="flex-1">
                <h3 className="font-medium mb-2">Période</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground">Du</label>
                    <input
                      type="date"
                      value={filters.startDate || ''}
                      onChange={e => updateFilters({ startDate: e.target.value || null })}
                      className="w-full px-3 py-1 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm text-muted-foreground">Au</label>
                    <input
                      type="date"
                      value={filters.endDate || ''}
                      onChange={e => updateFilters({ endDate: e.target.value || null })}
                      className="w-full px-3 py-1 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tri et réinitialisation */}
            <div className="flex flex-col md:flex-row justify-between mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm">Trier par:</span>
                <select
                  value={`${filters.sortBy}-${filters.sortOrder}`}
                  onChange={e => {
                    const [sortBy, sortOrder] = e.target.value.split('-');
                    updateFilters({ 
                      sortBy: sortBy as FilterOptions['sortBy'], 
                      sortOrder: sortOrder as FilterOptions['sortOrder'] 
                    });
                  }}
                  className="px-3 py-1 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="start_date-asc">Date (croissant)</option>
                  <option value="start_date-desc">Date (décroissant)</option>
                  <option value="title-asc">Titre (A-Z)</option>
                  <option value="title-desc">Titre (Z-A)</option>
                  <option value="created_at-desc">Création (récent)</option>
                  <option value="created_at-asc">Création (ancien)</option>
                </select>
              </div>
              
              <button
                onClick={resetFilters}
                className="mt-2 md:mt-0 px-4 py-1 flex items-center justify-center text-sm bg-destructive/10 text-destructive rounded-md hover:bg-destructive/20 transition-all"
              >
                <X className="w-4 h-4 mr-1" />
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Liste des événements */}
      <div className="mb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="glass p-8 rounded-xl text-center">
            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium mb-2">Aucun événement trouvé</h2>
            <p className="text-muted-foreground mb-6">
              {filters.search || filters.status.length > 0 || filters.targetGroup.length > 0 || filters.startDate || filters.endDate
                ? 'Essayez de modifier vos filtres pour voir plus de résultats.'
                : 'Commencez par créer votre premier événement.'}
            </p>
            {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
              <Link 
                href="/dashboard/events/new" 
                className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                <Plus className="w-5 h-5 mr-2" />
                Créer un événement
              </Link>
            )}
          </div>
        ) : viewMode === 'list' ? (
          <div className="glass rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4">Titre</th>
                    <th className="text-left py-3 px-4">Dates</th>
                    <th className="text-left py-3 px-4">Statut</th>
                    <th className="text-left py-3 px-4">Groupe cible</th>
                    <th className="text-left py-3 px-4">Participants</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(event => {
                    const timeStatus = getEventTimeStatus(event.start_date, event.end_date);
                    
                    return (
                      <tr key={event.id} className="border-b border-border hover:bg-accent/10">
                        <td className="py-3 px-4">
                          <Link 
                            href={`/dashboard/events/${event.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {event.title}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.location || 'Aucun lieu spécifié'}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span>
                              {format(parseISO(event.start_date), 'dd/MM/yyyy')}
                              {' - '}
                              {format(parseISO(event.end_date), 'dd/MM/yyyy')}
                            </span>
                            <span className={`text-xs ${timeStatus.className}`}>
                              {timeStatus.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(event.status)}`}>
                            {getStatusLabel(event.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {getTargetGroupIcon(event.target_group)}
                            <span className="ml-1">{getTargetGroupLabel(event.target_group)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-1 text-muted-foreground" />
                            <span>{event.participantCount || 0}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end space-x-2">
                            <Link 
                              href={`/dashboard/events/${event.id}`}
                              className="p-2 rounded-md hover:bg-accent/50"
                              title="Voir les détails"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            
                            {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
                              <>
                                <Link 
                                  href={`/dashboard/events/${event.id}/edit`}
                                  className="p-2 rounded-md hover:bg-accent/50"
                                  title="Modifier"
                                >
                                  <Edit className="w-4 h-4" />
                                </Link>
                                
                                <button 
                                  onClick={() => duplicateEvent(event.id)}
                                  className="p-2 rounded-md hover:bg-accent/50"
                                  title="Dupliquer"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                
                                {event.status !== 'completed' && (
                                  <button 
                                    onClick={() => toggleEventStatus(event.id, event.status)}
                                    className="p-2 rounded-md hover:bg-accent/50"
                                    title={event.status === 'published' ? 'Dépublier' : 'Publier'}
                                  >
                                    {event.status === 'published' ? (
                                      <EyeOff className="w-4 h-4" />
                                    ) : (
                                      <Eye className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                                
                                {event.status === 'draft' && (
                                  <button 
                                    onClick={() => deleteEvent(event.id)}
                                    className="p-2 rounded-md hover:bg-destructive/20 text-destructive"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => {
              const timeStatus = getEventTimeStatus(event.start_date, event.end_date);
              
              return (
                <div key={event.id} className="glass rounded-xl overflow-hidden hover-lift">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusClass(event.status)}`}>
                        {getStatusLabel(event.status)}
                      </span>
                      <span className={`text-xs ${timeStatus.className}`}>
                        {timeStatus.label}
                      </span>
                    </div>
                    
                    <Link href={`/dashboard/events/${event.id}`}>
                      <h3 className="text-xl font-medium mb-2 hover:text-primary">{event.title}</h3>
                    </Link>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm">
                        <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>
                          {format(parseISO(event.start_date), 'dd/MM/yyyy')}
                          {' - '}
                          {format(parseISO(event.end_date), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      
                      {event.location && (
                        <div className="flex items-center text-sm">
                          <AlertCircle className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center text-sm">
                        {getTargetGroupIcon(event.target_group)}
                        <span className="ml-2">{getTargetGroupLabel(event.target_group)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm">
                        <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span>{event.participantCount || 0} participants</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-border">
                      <Link 
                        href={`/dashboard/events/${event.id}`}
                        className="px-3 py-1 text-sm bg-accent/30 rounded-md hover:bg-accent/50 transition-all"
                      >
                        Voir détails
                      </Link>
                      
                      {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
                        <div className="flex space-x-1">
                          <Link 
                            href={`/dashboard/events/${event.id}/edit`}
                            className="p-1 rounded-md hover:bg-accent/50"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          
                          <button 
                            onClick={() => duplicateEvent(event.id)}
                            className="p-1 rounded-md hover:bg-accent/50"
                            title="Dupliquer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          
                          {event.status !== 'completed' && (
                            <button 
                              onClick={() => toggleEventStatus(event.id, event.status)}
                              className="p-1 rounded-md hover:bg-accent/50"
                              title={event.status === 'published' ? 'Dépublier' : 'Publier'}
                            >
                              {event.status === 'published' ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Affichage de {(filters.page - 1) * filters.perPage + 1} à {Math.min(filters.page * filters.perPage, totalEvents)} sur {totalEvents} événements
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => changePage(filters.page - 1)}
              disabled={filters.page === 1}
              className={`p-2 rounded-md ${
                filters.page === 1 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-accent/50'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Calculer les pages à afficher autour de la page courante
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (filters.page <= 3) {
                pageNum = i + 1;
              } else if (filters.page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = filters.page - 2 + i;
              }
              
              return (
                <button
                  key={i}
                  onClick={() => changePage(pageNum)}
                  className={`w-8 h-8 rounded-md flex items-center justify-center ${
                    filters.page === pageNum
                      ? 'bg-primary text-white'
                      : 'hover:bg-accent/50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => changePage(filters.page + 1)}
              disabled={filters.page === totalPages}
              className={`p-2 rounded-md ${
                filters.page === totalPages 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-accent/50'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
