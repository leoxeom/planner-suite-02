'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/components/providers/supabase-provider';
import { toast } from 'react-hot-toast';
import { format, parseISO, addDays, isSameDay, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  Plus,
  Download,
  Edit,
  Copy,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Move,
  AlertCircle,
  Check,
  Settings,
  List,
  LayoutGrid
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

// Types pour les feuilles de route et les filtres
type DailySchedule = {
  id: string;
  event_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  title: string;
  description: string | null;
  target_groups: string[];
  location: string | null;
  required_skills: string[] | null;
  max_participants: number | null;
  is_mandatory: boolean;
  responsible_person: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type Event = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
};

type FilterOptions = {
  targetGroups: string[];
  startDate: string | null;
  endDate: string | null;
  viewMode: 'timeline' | 'grid' | 'list';
};

type ExportOptions = {
  format: 'pdf' | 'csv' | 'excel';
  targetGroups: string[];
  dateRange: 'all' | 'day' | 'custom';
  startDate: string | null;
  endDate: string | null;
  includeDetails: boolean;
  includeParticipants: boolean;
  includeLogo: boolean;
};

export default function EventSchedulesPage() {
  const params = useParams();
  const router = useRouter();
  const { supabase, profile, executeAuthOperation } = useSupabase();
  const eventId = params.id as string;
  
  // États pour les données
  const [event, setEvent] = useState<Event | null>(null);
  const [schedules, setSchedules] = useState<DailySchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  
  // États pour les filtres
  const [filters, setFilters] = useState<FilterOptions>({
    targetGroups: [],
    startDate: null,
    endDate: null,
    viewMode: 'timeline',
  });
  
  // État pour les options d'export
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    targetGroups: [],
    dateRange: 'all',
    startDate: null,
    endDate: null,
    includeDetails: true,
    includeParticipants: false,
    includeLogo: true,
  });
  
  // Charger l'événement
  useEffect(() => {
    const loadEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, start_date, end_date, status')
          .eq('id', eventId)
          .single();
        
        if (error) throw error;
        
        setEvent(data);
        
        // Initialiser les filtres avec les dates de l'événement
        setFilters(prev => ({
          ...prev,
          startDate: data.start_date,
          endDate: data.end_date,
        }));
        
        // Initialiser la date sélectionnée avec la date de début
        setSelectedDay(parseISO(data.start_date));
        
      } catch (error) {
        console.error('Erreur lors du chargement de l\'événement:', error);
        toast.error('Erreur lors du chargement de l\'événement');
        router.push('/dashboard/events');
      }
    };
    
    if (eventId) {
      loadEvent();
    }
  }, [eventId, supabase, router]);
  
  // Charger les feuilles de route
  useEffect(() => {
    const loadSchedules = async () => {
      if (!event) return;
      
      setIsLoading(true);
      try {
        await executeAuthOperation(async () => {
          let query = supabase
            .from('daily_schedules')
            .select('*')
            .eq('event_id', eventId)
            .order('schedule_date', { ascending: true })
            .order('start_time', { ascending: true });
          
          // Appliquer les filtres de date
          if (filters.startDate) {
            query = query.gte('schedule_date', filters.startDate);
          }
          
          if (filters.endDate) {
            query = query.lte('schedule_date', filters.endDate);
          }
          
          // Appliquer les filtres de groupe cible
          if (filters.targetGroups.length > 0) {
            // Filtrage côté client car les tableaux PostgreSQL sont complexes à filtrer
            const { data, error } = await query;
            
            if (error) throw error;
            
            // Filtrer les résultats côté client
            const filteredData = data.filter(schedule => {
              return filters.targetGroups.some(group => 
                schedule.target_groups.includes(group) || schedule.target_groups.includes('both')
              );
            });
            
            setSchedules(filteredData);
          } else {
            // Pas de filtrage par groupe
            const { data, error } = await query;
            
            if (error) throw error;
            
            setSchedules(data);
          }
        });
      } catch (error) {
        console.error('Erreur lors du chargement des feuilles de route:', error);
        toast.error('Erreur lors du chargement des feuilles de route');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSchedules();
  }, [event, filters, eventId, supabase, executeAuthOperation]);
  
  // Fonction pour créer une nouvelle feuille de route
  const createSchedule = () => {
    if (!event) return;
    
    // Rediriger vers la page de création avec la date sélectionnée pré-remplie
    const dateParam = selectedDay 
      ? `?date=${format(selectedDay, 'yyyy-MM-dd')}` 
      : '';
    
    router.push(`/dashboard/events/${eventId}/schedules/new${dateParam}`);
  };
  
  // Fonction pour dupliquer une feuille de route
  const duplicateSchedule = async (scheduleId: string) => {
    try {
      setIsLoading(true);
      
      // Vérifier si l'utilisateur est un régisseur ou un admin
      if (profile?.role !== 'regisseur' && profile?.role !== 'admin') {
        toast.error('Vous n\'avez pas les permissions nécessaires');
        return;
      }
      
      // Récupérer la feuille de route à dupliquer
      const { data: scheduleToDuplicate, error: fetchError } = await supabase
        .from('daily_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Créer une nouvelle feuille de route avec les mêmes données
      const { data: newSchedule, error: createError } = await supabase
        .from('daily_schedules')
        .insert({
          ...scheduleToDuplicate,
          id: undefined, // Laisser la base de données générer un nouvel ID
          title: `Copie de ${scheduleToDuplicate.title}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: profile.id
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      toast.success('Feuille de route dupliquée avec succès');
      
      // Recharger les feuilles de route
      const { data, error } = await supabase
        .from('daily_schedules')
        .select('*')
        .eq('event_id', eventId)
        .order('schedule_date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      
      setSchedules(data);
    } catch (error) {
      console.error('Erreur lors de la duplication:', error);
      toast.error('Erreur lors de la duplication');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour supprimer une feuille de route
  const deleteSchedule = async (scheduleId: string) => {
    try {
      setIsLoading(true);
      
      // Vérifier si l'utilisateur est un régisseur ou un admin
      if (profile?.role !== 'regisseur' && profile?.role !== 'admin') {
        toast.error('Vous n\'avez pas les permissions nécessaires');
        return;
      }
      
      // Confirmer la suppression
      if (!confirm('Êtes-vous sûr de vouloir supprimer cette feuille de route ? Cette action est irréversible.')) {
        setIsLoading(false);
        return;
      }
      
      const { error } = await supabase
        .from('daily_schedules')
        .delete()
        .eq('id', scheduleId);
      
      if (error) throw error;
      
      toast.success('Feuille de route supprimée avec succès');
      
      // Mettre à jour la liste des feuilles de route
      setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fonction pour mettre à jour l'ordre des feuilles de route
  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    
    // Si l'élément est déposé au même endroit
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    
    try {
      // Récupérer les feuilles de route du jour concerné
      const daySchedules = schedules.filter(schedule => 
        schedule.schedule_date === source.droppableId
      );
      
      // Réorganiser les éléments
      const [removed] = daySchedules.splice(source.index, 1);
      daySchedules.splice(destination.index, 0, removed);
      
      // Mettre à jour l'affichage
      const newSchedules = [...schedules];
      const dayIndices = schedules
        .map((s, i) => s.schedule_date === source.droppableId ? i : null)
        .filter(i => i !== null) as number[];
      
      dayIndices.forEach((scheduleIndex, arrayIndex) => {
        if (scheduleIndex !== null) {
          newSchedules[scheduleIndex] = daySchedules[arrayIndex];
        }
      });
      
      setSchedules(newSchedules);
      
      // TODO: Mettre à jour l'ordre dans la base de données
      // Cette fonctionnalité nécessiterait une colonne 'order' dans la table daily_schedules
      toast.success('Ordre mis à jour');
    } catch (error) {
      console.error('Erreur lors de la réorganisation:', error);
      toast.error('Erreur lors de la réorganisation');
    }
  };
  
  // Fonction pour exporter les feuilles de route en PDF
  const exportSchedules = async () => {
    try {
      setIsLoading(true);
      
      // Filtrer les feuilles de route selon les options d'export
      let filteredSchedules = [...schedules];
      
      // Filtrer par groupe cible
      if (exportOptions.targetGroups.length > 0) {
        filteredSchedules = filteredSchedules.filter(schedule => {
          return exportOptions.targetGroups.some(group => 
            schedule.target_groups.includes(group) || schedule.target_groups.includes('both')
          );
        });
      }
      
      // Filtrer par plage de dates
      if (exportOptions.dateRange === 'day' && selectedDay) {
        const selectedDateStr = format(selectedDay, 'yyyy-MM-dd');
        filteredSchedules = filteredSchedules.filter(schedule => 
          schedule.schedule_date === selectedDateStr
        );
      } else if (exportOptions.dateRange === 'custom') {
        if (exportOptions.startDate) {
          filteredSchedules = filteredSchedules.filter(schedule => 
            schedule.schedule_date >= exportOptions.startDate!
          );
        }
        
        if (exportOptions.endDate) {
          filteredSchedules = filteredSchedules.filter(schedule => 
            schedule.schedule_date <= exportOptions.endDate!
          );
        }
      }
      
      // Simuler la génération du PDF (dans une vraie implémentation, utilisez @react-pdf/renderer)
      setTimeout(() => {
        toast.success('Feuille de route exportée avec succès');
        setIsExportModalOpen(false);
        setIsLoading(false);
      }, 1500);
      
      // NOTE: Dans une implémentation réelle, utilisez @react-pdf/renderer
      // Exemple:
      /*
      import { Document, Page, Text, View, StyleSheet, PDFDownloadLink } from '@react-pdf/renderer';
      
      const SchedulesPDF = () => (
        <Document>
          <Page>
            <View>
              <Text>Feuille de route: {event?.title}</Text>
              {filteredSchedules.map(schedule => (
                <View key={schedule.id}>
                  <Text>{schedule.title}</Text>
                  <Text>{format(parseISO(schedule.schedule_date), 'dd/MM/yyyy')}</Text>
                  <Text>{schedule.start_time} - {schedule.end_time}</Text>
                </View>
              ))}
            </View>
          </Page>
        </Document>
      );
      
      return (
        <PDFDownloadLink document={<SchedulesPDF />} fileName="feuille-de-route.pdf">
          {({ blob, url, loading, error }) =>
            loading ? 'Génération du PDF...' : 'Télécharger le PDF'
          }
        </PDFDownloadLink>
      );
      */
      
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export');
      setIsLoading(false);
    }
  };
  
  // Grouper les feuilles de route par jour
  const schedulesByDay = useMemo(() => {
    const grouped: Record<string, DailySchedule[]> = {};
    
    schedules.forEach(schedule => {
      if (!grouped[schedule.schedule_date]) {
        grouped[schedule.schedule_date] = [];
      }
      grouped[schedule.schedule_date].push(schedule);
    });
    
    return grouped;
  }, [schedules]);
  
  // Générer les jours à afficher dans la timeline
  const timelineDays = useMemo(() => {
    if (!event) return [];
    
    const startDate = parseISO(event.start_date);
    const endDate = parseISO(event.end_date);
    const dayCount = differenceInDays(endDate, startDate) + 1;
    
    return Array.from({ length: dayCount }, (_, i) => addDays(startDate, i));
  }, [event]);
  
  // Fonction pour obtenir la classe de groupe cible
  const getTargetGroupClass = (groups: string[]) => {
    if (groups.includes('both')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
    } else if (groups.includes('artistes')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
    } else if (groups.includes('techniques')) {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
  };
  
  // Fonction pour obtenir le libellé du groupe cible
  const getTargetGroupLabel = (groups: string[]) => {
    if (groups.includes('both')) {
      return 'Tous';
    } else if (groups.includes('artistes') && groups.includes('techniques')) {
      return 'Artistes & Techniques';
    } else if (groups.includes('artistes')) {
      return 'Artistes';
    } else if (groups.includes('techniques')) {
      return 'Techniques';
    }
    return 'Non spécifié';
  };
  
  // Fonction pour formater l'heure
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    return `${hours}h${minutes}`;
  };
  
  // Rendu de la page
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent p-4 md:p-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Link 
              href={`/dashboard/events/${eventId}`}
              className="text-muted-foreground hover:text-foreground flex items-center"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Retour à l'événement
            </Link>
          </div>
          <h1 className="text-3xl font-bold mt-2">{event?.title || 'Chargement...'}</h1>
          <p className="text-muted-foreground">
            Feuilles de route
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
            <button 
              onClick={createSchedule}
              className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover-lift"
              disabled={isLoading}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nouvelle feuille de route
            </button>
          )}
          
          <button 
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center px-4 py-2 bg-accent/50 text-foreground rounded-lg hover:bg-accent/70"
            disabled={isLoading || schedules.length === 0}
          >
            <Download className="w-5 h-5 mr-2" />
            Exporter
          </button>
          
          {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
            <button 
              onClick={() => setIsReordering(!isReordering)}
              className={`flex items-center px-4 py-2 rounded-lg ${
                isReordering 
                  ? 'bg-primary/20 text-primary' 
                  : 'bg-accent/50 text-foreground hover:bg-accent/70'
              }`}
              disabled={isLoading || schedules.length === 0}
            >
              <Move className="w-5 h-5 mr-2" />
              {isReordering ? 'Terminer' : 'Réorganiser'}
            </button>
          )}
        </div>
      </div>
      
      {/* Filtres */}
      <div className="glass p-4 rounded-xl mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Filtres par groupe cible */}
          <div className="flex-1">
            <h3 className="font-medium mb-2">Groupe cible</h3>
            <div className="flex flex-wrap gap-2">
              {['artistes', 'techniques', 'both'].map(group => (
                <button
                  key={group}
                  onClick={() => {
                    if (filters.targetGroups.includes(group)) {
                      setFilters(prev => ({
                        ...prev,
                        targetGroups: prev.targetGroups.filter(g => g !== group)
                      }));
                    } else {
                      setFilters(prev => ({
                        ...prev,
                        targetGroups: [...prev.targetGroups, group]
                      }));
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-sm flex items-center ${
                    filters.targetGroups.includes(group)
                      ? group === 'artistes'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                        : group === 'techniques'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                      : 'bg-accent/30 hover:bg-accent/50'
                  }`}
                >
                  {group === 'artistes' && <Users className="w-4 h-4 mr-1" />}
                  {group === 'techniques' && <FileText className="w-4 h-4 mr-1" />}
                  {group === 'both' && <Check className="w-4 h-4 mr-1" />}
                  <span>
                    {group === 'artistes' ? 'Artistes' : 
                     group === 'techniques' ? 'Techniques' : 'Tous'}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Sélection de vue */}
          <div className="flex-1">
            <h3 className="font-medium mb-2">Affichage</h3>
            <div className="flex rounded-md overflow-hidden border border-border">
              <button
                onClick={() => setFilters(prev => ({ ...prev, viewMode: 'timeline' }))}
                className={`px-3 py-2 flex items-center ${filters.viewMode === 'timeline' ? 'bg-primary text-white' : 'bg-accent/50'}`}
                title="Vue timeline"
              >
                <Calendar className="w-5 h-5" />
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, viewMode: 'grid' }))}
                className={`px-3 py-2 flex items-center ${filters.viewMode === 'grid' ? 'bg-primary text-white' : 'bg-accent/50'}`}
                title="Vue grille"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, viewMode: 'list' }))}
                className={`px-3 py-2 flex items-center ${filters.viewMode === 'list' ? 'bg-primary text-white' : 'bg-accent/50'}`}
                title="Vue liste"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Navigation par jour (uniquement en mode timeline) */}
          {filters.viewMode === 'timeline' && (
            <div className="flex-1">
              <h3 className="font-medium mb-2">Navigation par jour</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (selectedDay && timelineDays.length > 0) {
                      const currentIndex = timelineDays.findIndex(day => 
                        isSameDay(day, selectedDay)
                      );
                      if (currentIndex > 0) {
                        setSelectedDay(timelineDays[currentIndex - 1]);
                      }
                    }
                  }}
                  disabled={!selectedDay || timelineDays.findIndex(day => isSameDay(day, selectedDay!)) === 0}
                  className="p-2 rounded-md hover:bg-accent/50 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex-1 text-center">
                  {selectedDay && (
                    <div className="font-medium">
                      {format(selectedDay, 'EEEE dd MMMM yyyy', { locale: fr })}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    if (selectedDay && timelineDays.length > 0) {
                      const currentIndex = timelineDays.findIndex(day => 
                        isSameDay(day, selectedDay)
                      );
                      if (currentIndex < timelineDays.length - 1) {
                        setSelectedDay(timelineDays[currentIndex + 1]);
                      }
                    }
                  }}
                  disabled={!selectedDay || timelineDays.findIndex(day => isSameDay(day, selectedDay!)) === timelineDays.length - 1}
                  className="p-2 rounded-md hover:bg-accent/50 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Contenu principal */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : schedules.length === 0 ? (
        <div className="glass p-8 rounded-xl text-center">
          <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium mb-2">Aucune feuille de route</h2>
          <p className="text-muted-foreground mb-6">
            {filters.targetGroups.length > 0
              ? 'Essayez de modifier vos filtres pour voir plus de résultats.'
              : 'Commencez par créer votre première feuille de route.'}
          </p>
          {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
            <button 
              onClick={createSchedule}
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Plus className="w-5 h-5 mr-2" />
              Créer une feuille de route
            </button>
          )}
        </div>
      ) : filters.viewMode === 'timeline' ? (
        <div className="glass rounded-xl p-6">
          {/* Mini calendrier pour navigation rapide */}
          <div className="mb-6 overflow-x-auto">
            <div className="flex space-x-2 pb-2">
              {timelineDays.map((day, index) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const hasSchedules = schedulesByDay[dateStr] && schedulesByDay[dateStr].length > 0;
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDay(day)}
                    className={`flex flex-col items-center justify-center min-w-[60px] h-16 rounded-lg p-2 transition-all ${
                      isSelected
                        ? 'bg-primary text-white scale-105'
                        : hasSchedules
                          ? 'bg-accent/50 hover:bg-accent/70'
                          : 'bg-background/50 hover:bg-accent/30'
                    }`}
                  >
                    <span className="text-xs font-medium">
                      {format(day, 'EEE', { locale: fr })}
                    </span>
                    <span className="text-lg font-bold">
                      {format(day, 'dd')}
                    </span>
                    {hasSchedules && (
                      <span className={`w-2 h-2 rounded-full mt-1 ${
                        isSelected ? 'bg-white' : 'bg-primary'
                      }`}></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Timeline du jour sélectionné */}
          {selectedDay && (
            <div className="relative">
              <h3 className="font-medium text-lg mb-4">
                {format(selectedDay, 'EEEE dd MMMM yyyy', { locale: fr })}
              </h3>
              
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId={format(selectedDay, 'yyyy-MM-dd')}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {schedulesByDay[format(selectedDay, 'yyyy-MM-dd')]?.map((schedule, index) => (
                        <Draggable
                          key={schedule.id}
                          draggableId={schedule.id}
                          index={index}
                          isDragDisabled={!isReordering}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`glass p-4 rounded-lg border-l-4 ${
                                getTargetGroupClass(schedule.target_groups).replace('bg-', 'border-')
                              } ${isReordering ? 'cursor-move' : ''}`}
                            >
                              <div className="flex flex-col md:flex-row justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center">
                                    {isReordering && (
                                      <div
                                        {...provided.dragHandleProps}
                                        className="mr-2 p-1 rounded-md hover:bg-accent/50"
                                      >
                                        <Move className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                    )}
                                    <h4 className="font-medium text-lg">{schedule.title}</h4>
                                    <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getTargetGroupClass(schedule.target_groups)}`}>
                                      {getTargetGroupLabel(schedule.target_groups)}
                                    </span>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                                    <div className="flex items-center text-sm">
                                      <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                                      <span>
                                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                      </span>
                                    </div>
                                    
                                    {schedule.location && (
                                      <div className="flex items-center text-sm">
                                        <AlertCircle className="w-4 h-4 mr-1 text-muted-foreground" />
                                        <span>{schedule.location}</span>
                                      </div>
                                    )}
                                    
                                    {schedule.responsible_person && (
                                      <div className="flex items-center text-sm">
                                        <Users className="w-4 h-4 mr-1 text-muted-foreground" />
                                        <span>Responsable: {schedule.responsible_person}</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {schedule.description && (
                                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                      {schedule.description}
                                    </p>
                                  )}
                                </div>
                                
                                {!isReordering && (profile?.role === 'regisseur' || profile?.role === 'admin') && (
                                  <div className="flex mt-4 md:mt-0 space-x-2">
                                    <Link 
                                      href={`/dashboard/events/${eventId}/schedules/${schedule.id}`}
                                      className="p-2 rounded-md hover:bg-accent/50"
                                      title="Voir les détails"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Link>
                                    
                                    <Link 
                                      href={`/dashboard/events/${eventId}/schedules/${schedule.id}/edit`}
                                      className="p-2 rounded-md hover:bg-accent/50"
                                      title="Modifier"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Link>
                                    
                                    <button 
                                      onClick={() => duplicateSchedule(schedule.id)}
                                      className="p-2 rounded-md hover:bg-accent/50"
                                      title="Dupliquer"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </button>
                                    
                                    <button 
                                      onClick={() => deleteSchedule(schedule.id)}
                                      className="p-2 rounded-md hover:bg-destructive/20 text-destructive"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      )) || (
                        <div className="text-center py-8 text-muted-foreground">
                          Aucune feuille de route pour cette journée
                        </div>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}
        </div>
      ) : filters.viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(schedulesByDay).map(([date, daySchedules]) => (
            <div key={date} className="glass rounded-xl overflow-hidden">
              <div className="bg-accent/30 p-4">
                <h3 className="font-medium">
                  {format(parseISO(date), 'EEEE dd MMMM yyyy', { locale: fr })}
                </h3>
                <div className="text-sm text-muted-foreground">
                  {daySchedules.length} élément{daySchedules.length > 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="p-4 space-y-3">
                {daySchedules.map(schedule => (
                  <div 
                    key={schedule.id} 
                    className={`p-3 rounded-md border-l-4 ${
                      getTargetGroupClass(schedule.target_groups).replace('bg-', 'border-')
                    } bg-background/50`}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{schedule.title}</h4>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getTargetGroupClass(schedule.target_groups)}`}>
                        {getTargetGroupLabel(schedule.target_groups)}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm mt-2">
                      <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                      <span>
                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                      </span>
                    </div>
                    
                    {schedule.location && (
                      <div className="flex items-center text-sm mt-1">
                        <AlertCircle className="w-4 h-4 mr-1 text-muted-foreground" />
                        <span>{schedule.location}</span>
                      </div>
                    )}
                    
                    {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
                      <div className="flex justify-end mt-2 space-x-1">
                        <Link 
                          href={`/dashboard/events/${eventId}/schedules/${schedule.id}`}
                          className="p-1 rounded-md hover:bg-accent/50"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        
                        <Link 
                          href={`/dashboard/events/${eventId}/schedules/${schedule.id}/edit`}
                          className="p-1 rounded-md hover:bg-accent/50"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        
                        <button 
                          onClick={() => duplicateSchedule(schedule.id)}
                          className="p-1 rounded-md hover:bg-accent/50"
                          title="Dupliquer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={() => deleteSchedule(schedule.id)}
                          className="p-1 rounded-md hover:bg-destructive/20 text-destructive"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4">Date</th>
                  <th className="text-left py-3 px-4">Horaire</th>
                  <th className="text-left py-3 px-4">Titre</th>
                  <th className="text-left py-3 px-4">Groupe cible</th>
                  <th className="text-left py-3 px-4">Lieu</th>
                  <th className="text-right py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map(schedule => (
                  <tr key={schedule.id} className="border-b border-border hover:bg-accent/10">
                    <td className="py-3 px-4">
                      {format(parseISO(schedule.schedule_date), 'dd/MM/yyyy')}
                    </td>
                    <td className="py-3 px-4">
                      {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                    </td>
                    <td className="py-3 px-4">
                      <Link 
                        href={`/dashboard/events/${eventId}/schedules/${schedule.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {schedule.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getTargetGroupClass(schedule.target_groups)}`}>
                        {getTargetGroupLabel(schedule.target_groups)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {schedule.location || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <Link 
                          href={`/dashboard/events/${eventId}/schedules/${schedule.id}`}
                          className="p-2 rounded-md hover:bg-accent/50"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        
                        {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
                          <>
                            <Link 
                              href={`/dashboard/events/${eventId}/schedules/${schedule.id}/edit`}
                              className="p-2 rounded-md hover:bg-accent/50"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            
                            <button 
                              onClick={() => duplicateSchedule(schedule.id)}
                              className="p-2 rounded-md hover:bg-accent/50"
                              title="Dupliquer"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            
                            <button 
                              onClick={() => deleteSchedule(schedule.id)}
                              className="p-2 rounded-md hover:bg-destructive/20 text-destructive"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Modal d'export */}
      {isExportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Exporter les feuilles de route</h2>
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="p-2 rounded-md hover:bg-accent/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Format */}
              <div>
                <label className="block text-sm font-medium mb-1">Format</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setExportOptions(prev => ({ ...prev, format: 'pdf' }))}
                    className={`flex-1 py-2 rounded-md ${
                      exportOptions.format === 'pdf' 
                        ? 'bg-primary text-white' 
                        : 'bg-accent/30 hover:bg-accent/50'
                    }`}
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => setExportOptions(prev => ({ ...prev, format: 'excel' }))}
                    className={`flex-1 py-2 rounded-md ${
                      exportOptions.format === 'excel' 
                        ? 'bg-primary text-white' 
                        : 'bg-accent/30 hover:bg-accent/50'
                    }`}
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => setExportOptions(prev => ({ ...prev, format: 'csv' }))}
                    className={`flex-1 py-2 rounded-md ${
                      exportOptions.format === 'csv' 
                        ? 'bg-primary text-white' 
                        : 'bg-accent/30 hover:bg-accent/50'
                    }`}
                  >
                    CSV
                  </button>
                </div>
              </div>
              
              {/* Groupes cibles */}
              <div>
                <label className="block text-sm font-medium mb-1">Groupes cibles</label>
                <div className="flex flex-wrap gap-2">
                  {['artistes', 'techniques', 'both'].map(group => (
                    <button
                      key={group}
                      onClick={() => {
                        if (exportOptions.targetGroups.includes(group)) {
                          setExportOptions(prev => ({
                            ...prev,
                            targetGroups: prev.targetGroups.filter(g => g !== group)
                          }));
                        } else {
                          setExportOptions(prev => ({
                            ...prev,
                            targetGroups: [...prev.targetGroups, group]
                          }));
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm flex items-center ${
                        exportOptions.targetGroups.includes(group)
                          ? group === 'artistes'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                            : group === 'techniques'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                              : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                          : 'bg-accent/30 hover:bg-accent/50'
                      }`}
                    >
                      {group === 'artistes' && <Users className="w-4 h-4 mr-1" />}
                      {group === 'techniques' && <FileText className="w-4 h-4 mr-1" />}
                      {group === 'both' && <Check className="w-4 h-4 mr-1" />}
                      <span>
                        {group === 'artistes' ? 'Artistes' : 
                         group === 'techniques' ? 'Techniques' : 'Tous'}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {exportOptions.targetGroups.length === 0 ? 'Tous les groupes seront inclus' : ''}
                </p>
              </div>
              
              {/* Plage de dates */}
              <div>
                <label className="block text-sm font-medium mb-1">Plage de dates</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setExportOptions(prev => ({ ...prev, dateRange: 'all' }))}
                    className={`flex-1 py-2 rounded-md ${
                      exportOptions.dateRange === 'all' 
                        ? 'bg-primary text-white' 
                        : 'bg-accent/30 hover:bg-accent/50'
                    }`}
                  >
                    Tout
                  </button>
                  <button
                    onClick={() => setExportOptions(prev => ({ ...prev, dateRange: 'day' }))}
                    className={`flex-1 py-2 rounded-md ${
                      exportOptions.dateRange === 'day' 
                        ? 'bg-primary text-white' 
                        : 'bg-accent/30 hover:bg-accent/50'
                    }`}
                  >
                    Jour actuel
                  </button>
                  <button
                    onClick={() => setExportOptions(prev => ({ ...prev, dateRange: 'custom' }))}
                    className={`flex-1 py-2 rounded-md ${
                      exportOptions.dateRange === 'custom' 
                        ? 'bg-primary text-white' 
                        : 'bg-accent/30 hover:bg-accent/50'
                    }`}
                  >
                    Personnalisé
                  </button>
                </div>
                
                {exportOptions.dateRange === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Du</label>
                      <input
                        type="date"
                        value={exportOptions.startDate || ''}
                        onChange={e => setExportOptions(prev => ({ 
                          ...prev, 
                          startDate: e.target.value || null 
                        }))}
                        className="w-full px-3 py-1 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Au</label>
                      <input
                        type="date"
                        value={exportOptions.endDate || ''}
                        onChange={e => setExportOptions(prev => ({ 
                          ...prev, 
                          endDate: e.target.value || null 
                        }))}
                        className="w-full px-3 py-1 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Options supplémentaires */}
              <div>
                <label className="block text-sm font-medium mb-1">Options</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeDetails}
                      onChange={e => setExportOptions(prev => ({ 
                        ...prev, 
                        includeDetails: e.target.checked 
                      }))}
                      className="mr-2"
                    />
                    <span>Inclure les détails (descriptions, compétences requises)</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeParticipants}
                      onChange={e => setExportOptions(prev => ({ 
                        ...prev, 
                        includeParticipants: e.target.checked 
                      }))}
                      className="mr-2"
                    />
                    <span>Inclure la liste des participants</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeLogo}
                      onChange={e => setExportOptions(prev => ({ 
                        ...prev, 
                        includeLogo: e.target.checked 
                      }))}
                      className="mr-2"
                    />
                    <span>Inclure le logo et l'en-tête</span>
                  </label>
                </div>
              </div>
              
              {/* Boutons d'action */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 rounded-md bg-accent/30 hover:bg-accent/50"
                  disabled={isLoading}
                >
                  Annuler
                </button>
                
                <button
                  onClick={exportSchedules}
                  className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      <span>Exportation...</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Download className="w-5 h-5 mr-2" />
                      <span>Exporter</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
