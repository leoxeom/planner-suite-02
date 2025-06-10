'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/components/providers/supabase-provider';
import { toast } from 'react-hot-toast';
import { format, parseISO, differenceInDays, differenceInHours } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  Clock,
  FileText,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  UserPlus,
  UserMinus,
  BarChart,
  History,
  Download,
  Send,
  Mail,
  Loader2,
  CalendarRange,
  Info,
  X,
} from 'lucide-react';

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { supabase, profile, executeAuthOperation } = useSupabase();
  const eventId = params.id as string;
  
  // États
  const [event, setEvent] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isParticipating, setIsParticipating] = useState(false);
  const [participationStatus, setParticipationStatus] = useState<string | null>(null);
  const [participationId, setParticipationId] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [eventHistory, setEventHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'participants' | 'schedules' | 'history'>('info');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  
  // Chargement des données de l'événement
  useEffect(() => {
    const loadEventData = async () => {
      setIsLoading(true);
      try {
        await executeAuthOperation(async () => {
          // Récupérer les détails de l'événement
          const { data: eventData, error: eventError } = await supabase
            .from('events')
            .select(`
              *,
              created_by_profile:profiles!events_created_by_fkey(
                full_name,
                username,
                avatar_url
              )
            `)
            .eq('id', eventId)
            .single();
          
          if (eventError) throw eventError;
          
          setEvent(eventData);
          
          // Récupérer les participants
          const { data: participantsData, error: participantsError } = await supabase
            .from('event_participants')
            .select(`
              *,
              profiles:user_id(
                id,
                full_name,
                username,
                avatar_url,
                role,
                skills
              )
            `)
            .eq('event_id', eventId)
            .order('invited_at', { ascending: false });
          
          if (participantsError) throw participantsError;
          
          setParticipants(participantsData);
          
          // Vérifier si l'utilisateur actuel participe à l'événement
          const userParticipation = participantsData.find(
            (p) => p.profiles?.id === profile?.id
          );
          
          if (userParticipation) {
            setIsParticipating(true);
            setParticipationStatus(userParticipation.status);
            setParticipationId(userParticipation.id);
          }
          
          // Récupérer les feuilles de route
          const { data: schedulesData, error: schedulesError } = await supabase
            .from('daily_schedules')
            .select('*')
            .eq('event_id', eventId)
            .order('schedule_date', { ascending: true })
            .order('start_time', { ascending: true });
          
          if (schedulesError) throw schedulesError;
          
          setSchedules(schedulesData);
          
          // Récupérer l'historique des modifications (simulé pour le moment)
          // Dans une implémentation réelle, vous pourriez avoir une table d'historique
          setEventHistory([
            {
              id: '1',
              action: 'create',
              user_id: eventData.created_by,
              user_name: eventData.created_by_profile?.full_name || 'Utilisateur inconnu',
              timestamp: eventData.created_at,
              details: 'Événement créé'
            },
            {
              id: '2',
              action: 'update',
              user_id: eventData.created_by,
              user_name: eventData.created_by_profile?.full_name || 'Utilisateur inconnu',
              timestamp: eventData.updated_at,
              details: 'Informations mises à jour'
            },
            ...(eventData.published_at ? [{
              id: '3',
              action: 'publish',
              user_id: eventData.created_by,
              user_name: eventData.created_by_profile?.full_name || 'Utilisateur inconnu',
              timestamp: eventData.published_at,
              details: 'Événement publié'
            }] : [])
          ]);
        });
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (eventId) {
      loadEventData();
    }
  }, [eventId, supabase, profile, executeAuthOperation]);
  
  // Fonction pour rejoindre un événement
  const joinEvent = async () => {
    if (!profile) return;
    
    setIsActionLoading(true);
    try {
      await executeAuthOperation(async () => {
        // Vérifier si l'utilisateur est déjà participant
        if (isParticipating) {
          toast.error('Vous participez déjà à cet événement');
          return;
        }
        
        // Ajouter l'utilisateur comme participant
        const { data, error } = await supabase
          .from('event_participants')
          .insert({
            event_id: eventId,
            user_id: profile.id,
            status: 'confirmed',
            responded_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (error) throw error;
        
        toast.success('Vous avez rejoint l\'événement avec succès');
        
        // Mettre à jour l'état local
        setIsParticipating(true);
        setParticipationStatus('confirmed');
        setParticipationId(data.id);
        
        // Recharger les participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('event_participants')
          .select(`
            *,
            profiles:user_id(
              id,
              full_name,
              username,
              avatar_url,
              role,
              skills
            )
          `)
          .eq('event_id', eventId)
          .order('invited_at', { ascending: false });
        
        if (participantsError) throw participantsError;
        
        setParticipants(participantsData);
      });
    } catch (error) {
      console.error('Erreur lors de la participation à l\'événement:', error);
      toast.error('Erreur lors de la participation à l\'événement');
    } finally {
      setIsActionLoading(false);
    }
  };
  
  // Fonction pour quitter un événement
  const leaveEvent = async () => {
    if (!profile || !participationId) return;
    
    setIsActionLoading(true);
    try {
      await executeAuthOperation(async () => {
        // Vérifier si l'utilisateur est participant
        if (!isParticipating) {
          toast.error('Vous ne participez pas à cet événement');
          return;
        }
        
        // Supprimer la participation
        const { error } = await supabase
          .from('event_participants')
          .delete()
          .eq('id', participationId);
        
        if (error) throw error;
        
        toast.success('Vous avez quitté l\'événement avec succès');
        
        // Mettre à jour l'état local
        setIsParticipating(false);
        setParticipationStatus(null);
        setParticipationId(null);
        
        // Recharger les participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('event_participants')
          .select(`
            *,
            profiles:user_id(
              id,
              full_name,
              username,
              avatar_url,
              role,
              skills
            )
          `)
          .eq('event_id', eventId)
          .order('invited_at', { ascending: false });
        
        if (participantsError) throw participantsError;
        
        setParticipants(participantsData);
      });
    } catch (error) {
      console.error('Erreur lors du retrait de l\'événement:', error);
      toast.error('Erreur lors du retrait de l\'événement');
    } finally {
      setIsActionLoading(false);
    }
  };
  
  // Fonction pour répondre à une invitation
  const respondToInvitation = async (accept: boolean) => {
    if (!profile || !participationId) return;
    
    setIsActionLoading(true);
    try {
      await executeAuthOperation(async () => {
        // Mettre à jour le statut de la participation
        const { error } = await supabase
          .from('event_participants')
          .update({
            status: accept ? 'confirmed' : 'declined',
            responded_at: new Date().toISOString(),
          })
          .eq('id', participationId);
        
        if (error) throw error;
        
        toast.success(`Invitation ${accept ? 'acceptée' : 'refusée'} avec succès`);
        
        // Mettre à jour l'état local
        setParticipationStatus(accept ? 'confirmed' : 'declined');
        
        // Recharger les participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('event_participants')
          .select(`
            *,
            profiles:user_id(
              id,
              full_name,
              username,
              avatar_url,
              role,
              skills
            )
          `)
          .eq('event_id', eventId)
          .order('invited_at', { ascending: false });
        
        if (participantsError) throw participantsError;
        
        setParticipants(participantsData);
      });
    } catch (error) {
      console.error('Erreur lors de la réponse à l\'invitation:', error);
      toast.error('Erreur lors de la réponse à l\'invitation');
    } finally {
      setIsActionLoading(false);
    }
  };
  
  // Fonction pour changer le statut de l'événement
  const changeEventStatus = async (newStatus: 'draft' | 'published' | 'cancelled' | 'completed') => {
    if (!profile) return;
    
    // Vérifier si l'utilisateur est un régisseur ou un admin
    if (profile.role !== 'regisseur' && profile.role !== 'admin') {
      toast.error('Vous n\'avez pas les permissions nécessaires');
      return;
    }
    
    setIsActionLoading(true);
    try {
      await executeAuthOperation(async () => {
        const updates: any = {
          status: newStatus,
        };
        
        // Si on publie, ajouter la date de publication
        if (newStatus === 'published') {
          updates.published_at = new Date().toISOString();
        }
        
        // Mettre à jour le statut de l'événement
        const { data, error } = await supabase
          .from('events')
          .update(updates)
          .eq('id', eventId)
          .select()
          .single();
        
        if (error) throw error;
        
        toast.success(`Statut de l'événement mis à jour: ${getStatusLabel(newStatus)}`);
        
        // Mettre à jour l'état local
        setEvent({
          ...event,
          status: newStatus,
          published_at: newStatus === 'published' ? new Date().toISOString() : event.published_at,
        });
        
        // Ajouter à l'historique
        setEventHistory([
          ...eventHistory,
          {
            id: Date.now().toString(),
            action: newStatus,
            user_id: profile.id,
            user_name: profile.full_name || 'Utilisateur inconnu',
            timestamp: new Date().toISOString(),
            details: `Statut changé en ${getStatusLabel(newStatus)}`
          }
        ]);
        
        // Fermer les modales
        setIsCancelModalOpen(false);
      });
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
      toast.error('Erreur lors du changement de statut');
    } finally {
      setIsActionLoading(false);
    }
  };
  
  // Fonction pour supprimer l'événement
  const deleteEvent = async () => {
    if (!profile) return;
    
    // Vérifier si l'utilisateur est un régisseur ou un admin
    if (profile.role !== 'regisseur' && profile.role !== 'admin') {
      toast.error('Vous n\'avez pas les permissions nécessaires');
      return;
    }
    
    setIsActionLoading(true);
    try {
      await executeAuthOperation(async () => {
        // Supprimer l'événement
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', eventId);
        
        if (error) throw error;
        
        toast.success('Événement supprimé avec succès');
        
        // Rediriger vers la liste des événements
        router.push('/dashboard/events');
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsActionLoading(false);
      setIsDeleteModalOpen(false);
    }
  };
  
  // Fonction pour inviter un participant
  const inviteParticipant = () => {
    router.push(`/dashboard/events/${eventId}/invite`);
  };
  
  // Fonction pour créer une feuille de route
  const createSchedule = () => {
    router.push(`/dashboard/schedules/new?eventId=${eventId}`);
  };
  
  // Fonction pour exporter les feuilles de route
  const exportSchedules = () => {
    toast.success('Export des feuilles de route en cours...');
    // Implémentation à venir
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
  
  // Fonction pour obtenir le libellé du statut de participation
  const getParticipationStatusLabel = (status: string) => {
    switch (status) {
      case 'invited':
        return 'Invité';
      case 'confirmed':
        return 'Confirmé';
      case 'declined':
        return 'Refusé';
      case 'assigned':
        return 'Assigné';
      case 'completed':
        return 'Complété';
      default:
        return status;
    }
  };
  
  // Fonction pour obtenir la classe de statut de participation
  const getParticipationStatusClass = (status: string) => {
    switch (status) {
      case 'invited':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200';
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'declined':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      case 'assigned':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
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
        return <Users className="w-5 h-5" />;
      case 'techniques':
        return <FileText className="w-5 h-5" />;
      case 'both':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };
  
  // Fonction pour formater la durée
  const formatDuration = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const days = differenceInDays(end, start);
    
    if (days > 0) {
      return `${days} jour${days > 1 ? 's' : ''}`;
    } else {
      const hours = differenceInHours(end, start);
      return `${hours} heure${hours > 1 ? 's' : ''}`;
    }
  };
  
  // Fonction pour obtenir l'icône d'action d'historique
  const getHistoryActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="w-4 h-4" />;
      case 'update':
        return <Edit className="w-4 h-4" />;
      case 'publish':
        return <Eye className="w-4 h-4" />;
      case 'draft':
        return <EyeOff className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };
  
  // Fonction pour obtenir la classe d'action d'historique
  const getHistoryActionClass = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'update':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200';
      case 'publish':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'draft':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };
  
  // Rendu de la page
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent p-4 md:p-8">
      {/* En-tête */}
      <div className="flex items-center mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-accent/50 mr-4"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {isLoading ? 'Chargement...' : event?.title || 'Détails de l\'événement'}
          </h1>
          {!isLoading && event && (
            <p className="text-muted-foreground mt-1">
              {format(parseISO(event.start_date), 'dd MMMM yyyy', { locale: fr })} - {format(parseISO(event.end_date), 'dd MMMM yyyy', { locale: fr })}
            </p>
          )}
        </div>
        
        {/* Actions rapides */}
        {!isLoading && event && (
          <div className="flex space-x-2">
            {/* Actions pour régisseur/admin */}
            {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
              <>
                <Link 
                  href={`/dashboard/events/${eventId}/edit`}
                  className="p-2 rounded-md hover:bg-accent/50"
                  title="Modifier"
                >
                  <Edit className="w-5 h-5" />
                </Link>
                
                {event.status === 'draft' && (
                  <button
                    onClick={() => changeEventStatus('published')}
                    className="p-2 rounded-md hover:bg-accent/50"
                    title="Publier"
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                )}
                
                {event.status === 'published' && (
                  <>
                    <button
                      onClick={() => changeEventStatus('draft')}
                      className="p-2 rounded-md hover:bg-accent/50"
                      title="Dépublier"
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <EyeOff className="w-5 h-5" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => setIsCancelModalOpen(true)}
                      className="p-2 rounded-md hover:bg-accent/50"
                      title="Annuler l'événement"
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </button>
                  </>
                )}
                
                {event.status !== 'completed' && event.status !== 'cancelled' && (
                  <button
                    onClick={() => changeEventStatus('completed')}
                    className="p-2 rounded-md hover:bg-accent/50"
                    title="Marquer comme terminé"
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
                    )}
                  </button>
                )}
                
                {event.status === 'draft' && (
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="p-2 rounded-md hover:bg-destructive/20 text-destructive"
                    title="Supprimer"
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                )}
              </>
            )}
            
            {/* Actions pour intermittent */}
            {profile?.role === 'intermittent' && (
              <>
                {!isParticipating && event.status === 'published' && (
                  <button
                    onClick={joinEvent}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center"
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="w-5 h-5 mr-2" />
                    )}
                    Rejoindre
                  </button>
                )}
                
                {isParticipating && participationStatus === 'invited' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => respondToInvitation(true)}
                      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-5 h-5 mr-2" />
                      )}
                      Accepter
                    </button>
                    
                    <button
                      onClick={() => respondToInvitation(false)}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
                      disabled={isActionLoading}
                    >
                      {isActionLoading ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-5 h-5 mr-2" />
                      )}
                      Refuser
                    </button>
                  </div>
                )}
                
                {isParticipating && participationStatus === 'confirmed' && (
                  <button
                    onClick={leaveEvent}
                    className="px-4 py-2 bg-destructive text-white rounded-md hover:bg-destructive/90 flex items-center"
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <UserMinus className="w-5 h-5 mr-2" />
                    )}
                    Quitter
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      
      {/* Contenu principal */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : event ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Statut de l'événement */}
            <div className="glass p-6 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusClass(event.status)}`}>
                    {getStatusLabel(event.status)}
                  </span>
                  
                  {event.target_group && (
                    <div className="ml-3 flex items-center">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-1">
                        {getTargetGroupIcon(event.target_group)}
                      </div>
                      <span className="text-sm">{getTargetGroupLabel(event.target_group)}</span>
                    </div>
                  )}
                </div>
                
                {event.status === 'published' && (
                  <div className="text-sm text-muted-foreground">
                    Publié le {format(parseISO(event.published_at), 'dd/MM/yyyy')}
                  </div>
                )}
              </div>
              
              {/* Onglets */}
              <div className="border-b border-border mb-6">
                <div className="flex overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`px-4 py-2 border-b-2 ${
                      activeTab === 'info'
                        ? 'border-primary text-primary'
                        : 'border-transparent hover:border-border'
                    }`}
                  >
                    Informations
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('participants')}
                    className={`px-4 py-2 border-b-2 ${
                      activeTab === 'participants'
                        ? 'border-primary text-primary'
                        : 'border-transparent hover:border-border'
                    }`}
                  >
                    Participants ({participants.length})
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('schedules')}
                    className={`px-4 py-2 border-b-2 ${
                      activeTab === 'schedules'
                        ? 'border-primary text-primary'
                        : 'border-transparent hover:border-border'
                    }`}
                  >
                    Feuilles de route ({schedules.length})
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 border-b-2 ${
                      activeTab === 'history'
                        ? 'border-primary text-primary'
                        : 'border-transparent hover:border-border'
                    }`}
                  >
                    Historique
                  </button>
                </div>
              </div>
              
              {/* Contenu des onglets */}
              {activeTab === 'info' && (
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h2 className="text-xl font-bold mb-2">Description</h2>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {event.description || 'Aucune description fournie.'}
                    </p>
                  </div>
                  
                  {/* Informations détaillées */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-3">Dates et lieu</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <CalendarRange className="w-5 h-5 mr-3 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Début</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(event.start_date), 'EEEE d MMMM yyyy', { locale: fr })}
                              {' à '}
                              {format(parseISO(event.start_date), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <Clock className="w-5 h-5 mr-3 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Fin</p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(event.end_date), 'EEEE d MMMM yyyy', { locale: fr })}
                              {' à '}
                              {format(parseISO(event.end_date), 'HH:mm')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <MapPin className="w-5 h-5 mr-3 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Lieu</p>
                            <p className="text-sm text-muted-foreground">
                              {event.location || 'Aucun lieu spécifié'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-3">Détails supplémentaires</h3>
                      <div className="space-y-3">
                        <div className="flex items-center">
                          <Calendar className="w-5 h-5 mr-3 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Durée</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDuration(event.start_date, event.end_date)}
                            </p>
                          </div>
                        </div>
                        
                        {event.budget !== null && (
                          <div className="flex items-center">
                            <DollarSign className="w-5 h-5 mr-3 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Budget</p>
                              <p className="text-sm text-muted-foreground">
                                {event.budget.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {event.max_participants !== null && (
                          <div className="flex items-center">
                            <Users className="w-5 h-5 mr-3 text-muted-foreground" />
                            <div>
                              <p className="font-medium">Participants maximum</p>
                              <p className="text-sm text-muted-foreground">
                                {event.max_participants} personnes
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center">
                          <User className="w-5 h-5 mr-3 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Créé par</p>
                            <p className="text-sm text-muted-foreground">
                              {event.created_by_profile?.full_name || 'Utilisateur inconnu'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'participants' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Participants</h2>
                    
                    {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
                      <button
                        onClick={inviteParticipant}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center"
                      >
                        <UserPlus className="w-5 h-5 mr-2" />
                        Inviter
                      </button>
                    )}
                  </div>
                  
                  {participants.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Aucun participant pour le moment</p>
                      
                      {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
                        <button
                          onClick={inviteParticipant}
                          className="mt-4 px-4 py-2 bg-accent/50 rounded-md hover:bg-accent/70 transition-all"
                        >
                          Inviter des participants
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {participants.map((participant) => (
                        <div 
                          key={participant.id}
                          className="p-4 rounded-lg bg-accent/20 hover:bg-accent/30 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden mr-3">
                                {participant.profiles?.avatar_url ? (
                                  <img
                                    src={participant.profiles.avatar_url}
                                    alt={participant.profiles.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-5 h-5 text-primary" />
                                )}
                              </div>
                              
                              <div>
                                <p className="font-medium">
                                  {participant.profiles?.full_name || 'Utilisateur inconnu'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {participant.profiles?.role === 'regisseur' ? 'Régisseur' : 
                                   participant.profiles?.role === 'intermittent' ? 'Intermittent' : 
                                   participant.profiles?.role === 'admin' ? 'Administrateur' : 
                                   'Rôle inconnu'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center">
                              <span className={`px-2 py-1 text-xs rounded-full ${getParticipationStatusClass(participant.status)}`}>
                                {getParticipationStatusLabel(participant.status)}
                              </span>
                              
                              {participant.role && (
                                <span className="ml-2 px-2 py-1 text-xs bg-accent/50 rounded-full">
                                  {participant.role}
                                </span>
                              )}
                              
                              {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
                                <div className="ml-4">
                                  <button
                                    className="p-1 rounded-md hover:bg-accent/50"
                                    title="Plus d'options"
                                  >
                                    <MoreHorizontal className="w-5 h-5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {participant.profiles?.skills && participant.profiles.skills.length > 0 && (
                            <div className="mt-2 pl-13">
                              <p className="text-xs text-muted-foreground mb-1">Compétences :</p>
                              <div className="flex flex-wrap gap-1">
                                {participant.profiles.skills.map((skill: string, index: number) => (
                                  <span 
                                    key={index}
                                    className="px-2 py-0.5 text-xs bg-accent/30 rounded-full"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {participant.notes && (
                            <div className="mt-2 pl-13">
                              <p className="text-xs text-muted-foreground">{participant.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'schedules' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Feuilles de route</h2>
                    
                    <div className="flex space-x-2">
                      {schedules.length > 0 && (
                        <button
                          onClick={exportSchedules}
                          className="px-4 py-2 bg-accent/50 rounded-md hover:bg-accent/70 transition-all flex items-center"
                        >
                          <Download className="w-5 h-5 mr-2" />
                          Exporter
                        </button>
                      )}
                      
                      {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
                        <button
                          onClick={createSchedule}
                          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Créer
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {schedules.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">Aucune feuille de route pour le moment</p>
                      
                      {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
                        <button
                          onClick={createSchedule}
                          className="mt-4 px-4 py-2 bg-accent/50 rounded-md hover:bg-accent/70 transition-all"
                        >
                          Créer une feuille de route
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Grouper les feuilles de route par date */}
                      {Object.entries(
                        schedules.reduce((acc: Record<string, any[]>, schedule) => {
                          const date = schedule.schedule_date;
                          if (!acc[date]) acc[date] = [];
                          acc[date].push(schedule);
                          return acc;
                        }, {})
                      ).map(([date, dateSchedules]) => (
                        <div key={date} className="space-y-2">
                          <h3 className="font-medium">
                            {format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr })}
                          </h3>
                          
                          <div className="space-y-2">
                            {dateSchedules.map((schedule) => (
                              <Link
                                key={schedule.id}
                                href={`/dashboard/schedules/${schedule.id}`}
                                className="block p-4 rounded-lg bg-accent/20 hover:bg-accent/30 transition-all"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">{schedule.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {schedule.start_time.substring(0, 5)} - {schedule.end_time.substring(0, 5)}
                                      {schedule.location && ` | ${schedule.location}`}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center">
                                    {schedule.is_mandatory && (
                                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 rounded-full mr-2">
                                        Obligatoire
                                      </span>
                                    )}
                                    
                                    {schedule.target_groups && schedule.target_groups.length > 0 && (
                                      <div className="flex space-x-1">
                                        {schedule.target_groups.map((group: string, index: number) => (
                                          <span 
                                            key={index}
                                            className="px-2 py-1 text-xs bg-primary/20 text-primary rounded-full"
                                          >
                                            {getTargetGroupLabel(group)}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {schedule.description && (
                                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                    {schedule.description}
                                  </p>
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'history' && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Historique des modifications</h2>
                  
                  <div className="space-y-4">
                    {eventHistory.map((historyItem) => (
                      <div 
                        key={historyItem.id}
                        className="p-4 rounded-lg bg-accent/20 hover:bg-accent/30 transition-all"
                      >
                        <div className="flex items-start">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${getHistoryActionClass(historyItem.action)}`}>
                            {getHistoryActionIcon(historyItem.action)}
                          </div>
                          
                          <div className="flex-1">
                            <p className="font-medium">
                              {historyItem.details}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Par {historyItem.user_name} le {format(parseISO(historyItem.timestamp), 'dd/MM/yyyy à HH:mm')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Panneau latéral */}
          <div className="space-y-6">
            {/* Statut de participation */}
            {profile?.role === 'intermittent' && (
              <div className="glass p-6 rounded-xl">
                <h2 className="text-xl font-bold mb-4">Votre participation</h2>
                
                {isParticipating ? (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${getParticipationStatusClass(participationStatus || '')}`}>
                        {participationStatus === 'invited' ? (
                          <Clock className="w-5 h-5" />
                        ) : participationStatus === 'confirmed' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : participationStatus === 'declined' ? (
                          <XCircle className="w-5 h-5" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </div>
                      
                      <div>
                        <p className="font-medium">
                          {participationStatus === 'invited' ? 'Invitation en attente' :
                           participationStatus === 'confirmed' ? 'Participation confirmée' :
                           participationStatus === 'declined' ? 'Participation refusée' :
                           participationStatus === 'assigned' ? 'Assigné à l\'événement' :
                           participationStatus === 'completed' ? 'Participation terminée' :
                           'Statut inconnu'}
                        </p>
                        
                        {participationStatus === 'invited' && (
                          <p className="text-sm text-muted-foreground">
                            Merci de répondre à cette invitation
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {participationStatus === 'invited' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => respondToInvitation(true)}
                          className="flex-1 py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center justify-center"
                          disabled={isActionLoading}
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-5 h-5 mr-2" />
                          )}
                          Accepter
                        </button>
                        
                        <button
                          onClick={() => respondToInvitation(false)}
                          className="flex-1 py-2 px-4 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center"
                          disabled={isActionLoading}
                        >
                          {isActionLoading ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="w-5 h-5 mr-2" />
                          )}
                          Refuser
                        </button>
                      </div>
                    )}
                    
                    {participationStatus === 'confirmed' && (
                      <button
                        onClick={leaveEvent}
                        className="w-full py-2 px-4 bg-destructive text-white rounded-md hover:bg-destructive/90 flex items-center justify-center"
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <UserMinus className="w-5 h-5 mr-2" />
                        )}
                        Quitter l'événement
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertTriangle className="w-10 h-10 mx-auto text-amber-500 mb-2" />
                    <p className="text-muted-foreground mb-4">
                      Vous ne participez pas à cet événement
                    </p>
                    
                    {event.status === 'published' && (
                      <button
                        onClick={joinEvent}
                        className="py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 flex items-center justify-center mx-auto"
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                          <UserPlus className="w-5 h-5 mr-2" />
                        )}
                        Rejoindre l'événement
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Statistiques */}
            <div className="glass p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-4">Statistiques</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-muted-foreground" />
                    <span>Participants</span>
                  </div>
                  <span className="font-medium">{participants.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-muted-foreground" />
                    <span>Confirmés</span>
                  </div>
                  <span className="font-medium">
                    {participants.filter(p => p.status === 'confirmed' || p.status === 'assigned').length}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-muted-foreground" />
                    <span>En attente</span>
                  </div>
                  <span className="font-medium">
                    {participants.filter(p => p.status === 'invited').length}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-muted-foreground" />
                    <span>Feuilles de route</span>
                  </div>
                  <span className="font-medium">{schedules.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-muted-foreground" />
                    <span>Durée</span>
                  </div>
                  <span className="font-medium">
                    {formatDuration(event.start_date, event.end_date)}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Actions rapides */}
            <div className="glass p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-4">Actions rapides</h2>
              
              <div className="space-y-2">
                {(profile?.role === 'regisseur' || profile?.role === 'admin') && (
                  <>
                    <Link
                      href={`/dashboard/events/${eventId}/edit`}
                      className="w-full py-2 px-4 bg-accent/50 rounded-md hover:bg-accent/70 transition-all flex items-center justify-center"
                    >
                      <Edit className="w-5 h-5 mr-2" />
                      Modifier l'événement
                    </Link>
                    
                    <button
                      onClick={inviteParticipant}
                      className="w-full py-2 px-4 bg-accent/50 rounded-md hover:bg-accent/70 transition-all flex items-center justify-center"
                    >
                      <UserPlus className="w-5 h-5 mr-2" />
                      Inviter des participants
                    </button>
                    
                    <button
                      onClick={createSchedule}
                      className="w-full py-2 px-4 bg-accent/50 rounded-md hover:bg-accent/70 transition-all flex items-center justify-center"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      Créer une feuille de route
                    </button>
                    
                    <Link
                      href={`/dashboard/events/${eventId}/message`}
                      className="w-full py-2 px-4 bg-accent/50 rounded-md hover:bg-accent/70 transition-all flex items-center justify-center"
                    >
                      <Send className="w-5 h-5 mr-2" />
                      Envoyer un message
                    </Link>
                  </>
                )}
                
                {schedules.length > 0 && (
                  <button
                    onClick={exportSchedules}
                    className="w-full py-2 px-4 bg-accent/50 rounded-md hover:bg-accent/70 transition-all flex items-center justify-center"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Exporter les feuilles de route
                  </button>
                )}
                
                <Link
                  href={`/dashboard/events`}
                  className="w-full py-2 px-4 bg-accent/50 rounded-md hover:bg-accent/70 transition-all flex items-center justify-center"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Retour à la liste
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass p-8 rounded-xl text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h2 className="text-xl font-medium mb-2">Événement introuvable</h2>
          <p className="text-muted-foreground mb-6">
            L'événement que vous recherchez n'existe pas ou vous n'avez pas les permissions nécessaires pour y accéder.
          </p>
          <Link 
            href="/dashboard/events" 
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour à la liste des événements
          </Link>
        </div>
      )}
      
      {/* Modale de suppression */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass p-6 rounded-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Supprimer l'événement</h2>
            <p className="text-muted-foreground mb-6">
              Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-border rounded-md hover:bg-accent/50 transition-all"
                disabled={isActionLoading}
              >
                Annuler
              </button>
              
              <button
                onClick={deleteEvent}
                className="px-4 py-2 bg-destructive text-white rounded-md hover:bg-destructive/90 transition-all"
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Supprimer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modale d'annulation */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass p-6 rounded-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Annuler l'événement</h2>
            <p className="text-muted-foreground mb-6">
              Êtes-vous sûr de vouloir annuler cet événement ? Les participants seront notifiés de l'annulation.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 border border-border rounded-md hover:bg-accent/50 transition-all"
                disabled={isActionLoading}
              >
                Retour
              </button>
              
              <button
                onClick={() => changeEventStatus('cancelled')}
                className="px-4 py-2 bg-destructive text-white rounded-md hover:bg-destructive/90 transition-all"
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Annuler l\'événement'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
