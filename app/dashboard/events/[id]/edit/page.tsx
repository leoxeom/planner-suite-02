'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/components/providers/supabase-provider';
import { toast } from 'react-hot-toast';
import { format, parseISO, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ArrowLeft,
  Save,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Check,
  Info,
} from 'lucide-react';

export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const { supabase, profile, executeAuthOperation } = useSupabase();
  const eventId = params.id as string;
  
  // États
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // États du formulaire
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [maxParticipants, setMaxParticipants] = useState<string>('');
  const [targetGroup, setTargetGroup] = useState<'artistes' | 'techniques' | 'both'>('both');
  const [status, setStatus] = useState<'draft' | 'published' | 'cancelled' | 'completed'>('draft');
  
  // Chargement des données de l&apos;événement
  useEffect(() => {
    const loadEvent = async () => {
      setIsLoading(true);
      try {
        await executeAuthOperation(async () => {
          // Vérifier si l&apos;utilisateur est un régisseur ou un admin
          if (profile?.role !== 'regisseur' && profile?.role !== 'admin') {
            toast.error('Vous n&apos;avez pas les permissions nécessaires');
            router.push('/dashboard/events');
            return;
          }
          
          // Récupérer les détails de l&apos;événement
          const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .single();
          
          if (error) {
            console.error('Erreur lors du chargement de l&apos;événement:', error);
            toast.error('Erreur lors du chargement de l&apos;événement');
            router.push('/dashboard/events');
            return;
          }
          
          // Vérifier si l&apos;événement appartient à l&apos;utilisateur ou si c&apos;est un admin
          if (data.created_by !== profile?.id && profile?.role !== 'admin') {
            toast.error('Vous n&apos;avez pas les permissions nécessaires pour modifier cet événement');
            router.push('/dashboard/events');
            return;
          }
          
          // Remplir les champs du formulaire
          setTitle(data.title);
          setDescription(data.description || '');
          setStartDate(data.start_date);
          setEndDate(data.end_date);
          setLocation(data.location || '');
          setBudget(data.budget?.toString() || '');
          setMaxParticipants(data.max_participants?.toString() || '');
          setTargetGroup(data.target_group);
          setStatus(data.status);
        });
      } catch (error) {
        console.error('Erreur lors du chargement de l&apos;événement:', error);
        toast.error('Erreur lors du chargement de l&apos;événement');
        router.push('/dashboard/events');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (eventId) {
      loadEvent();
    }
  }, [eventId, supabase, profile, router, executeAuthOperation]);
  
  // Gestion de la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await executeAuthOperation(async () => {
        // Validation basique
        if (!title.trim() || !startDate || !endDate) {
          toast.error('Veuillez remplir tous les champs obligatoires');
          setIsSaving(false);
          return;
        }
        
        // Vérifier si la date de fin est après la date de début
        if (new Date(endDate) < new Date(startDate)) {
          toast.error('La date de fin doit être après la date de début');
          setIsSaving(false);
          return;
        }
        
        // Préparer les données à mettre à jour
        const eventData = {
          title,
          description: description || null,
          start_date: startDate,
          end_date: endDate,
          location: location || null,
          budget: budget ? parseFloat(budget) : null,
          max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
          target_group: targetGroup,
          status,
          updated_at: new Date().toISOString(),
        };
        
        // Mettre à jour l&apos;événement
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', eventId);
        
        if (error) {
          console.error('Erreur lors de la mise à jour de l&apos;événement:', error);
          toast.error('Erreur lors de la mise à jour de l&apos;événement');
          setIsSaving(false);
          return;
        }
        
        toast.success('Événement mis à jour avec succès');
        router.push(`/dashboard/events/${eventId}`);
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l&apos;événement:', error);
      toast.error('Erreur lors de la mise à jour de l&apos;événement');
      setIsSaving(false);
    }
  };
  
  // Gestion de la suppression de l&apos;événement
  const handleDelete = async () => {
    setIsSaving(true);
    
    try {
      await executeAuthOperation(async () => {
        // Vérifier si l&apos;événement a des participants
        const { data: participants, error: participantsError } = await supabase
          .from('event_participants')
          .select('id')
          .eq('event_id', eventId)
          .limit(1);
        
        if (participantsError) {
          console.error('Erreur lors de la vérification des participants:', participantsError);
          toast.error('Erreur lors de la suppression de l&apos;événement');
          setIsSaving(false);
          return;
        }
        
        // Si l&apos;événement a des participants et n&apos;est pas en brouillon, empêcher la suppression
        if (participants && participants.length > 0 && status !== 'draft') {
          toast.error('Impossible de supprimer un événement avec des participants');
          setIsSaving(false);
          return;
        }
        
        // Supprimer l&apos;événement
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', eventId);
        
        if (error) {
          console.error('Erreur lors de la suppression de l&apos;événement:', error);
          toast.error('Erreur lors de la suppression de l&apos;événement');
          setIsSaving(false);
          return;
        }
        
        toast.success('Événement supprimé avec succès');
        router.push('/dashboard/events');
      });
    } catch (error) {
      console.error('Erreur lors de la suppression de l&apos;événement:', error);
      toast.error('Erreur lors de la suppression de l&apos;événement');
      setIsSaving(false);
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
  
  // Fonction pour formater la date
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = parseISO(dateString);
      return format(date, 'yyyy-MM-dd');
    } catch (error) {
      console.error('Erreur de formatage de date:', error);
      return '';
    }
  };
  
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
        <div>
          <h1 className="text-3xl font-bold">
            {isLoading ? 'Chargement...' : `Modifier l&apos;événement`}
          </h1>
          <p className="text-muted-foreground mt-1">
            Modifiez les détails de votre événement
          </p>
        </div>
      </div>
      
      {/* Contenu principal */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire principal */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="glass p-6 rounded-xl space-y-6">
              {/* Titre */}
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre de l&apos;événement"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              
              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description de l&apos;événement"
                  rows={5}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="startDate" className="block text-sm font-medium">
                    Date de début <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="startDate"
                      type="date"
                      value={formatDateForInput(startDate)}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-10 px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="endDate" className="block text-sm font-medium">
                    Date de fin <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="endDate"
                      type="date"
                      value={formatDateForInput(endDate)}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full pl-10 px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
              </div>
              
              {/* Lieu */}
              <div className="space-y-2">
                <label htmlFor="location" className="block text-sm font-medium">
                  Lieu
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Lieu de l&apos;événement"
                    className="w-full pl-10 px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              
              {/* Budget et participants max */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="budget" className="block text-sm font-medium">
                    Budget (€)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="budget"
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="Budget"
                      min="0"
                      step="0.01"
                      className="w-full pl-10 px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="maxParticipants" className="block text-sm font-medium">
                    Participants maximum
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="maxParticipants"
                      type="number"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(e.target.value)}
                      placeholder="Nombre max. de participants"
                      min="0"
                      className="w-full pl-10 px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>
              
              {/* Groupe cible */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Groupe cible <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setTargetGroup('artistes')}
                    className={`py-2 px-4 rounded-md border ${
                      targetGroup === 'artistes'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background/50 border-border hover:bg-accent/30'
                    } transition-all flex items-center justify-center`}
                  >
                    Artistes
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetGroup('techniques')}
                    className={`py-2 px-4 rounded-md border ${
                      targetGroup === 'techniques'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background/50 border-border hover:bg-accent/30'
                    } transition-all flex items-center justify-center`}
                  >
                    Techniques
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetGroup('both')}
                    className={`py-2 px-4 rounded-md border ${
                      targetGroup === 'both'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background/50 border-border hover:bg-accent/30'
                    } transition-all flex items-center justify-center`}
                  >
                    Tous
                  </button>
                </div>
              </div>
              
              {/* Statut */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Statut <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    type="button"
                    onClick={() => setStatus('draft')}
                    className={`py-2 px-4 rounded-md border ${
                      status === 'draft'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background/50 border-border hover:bg-accent/30'
                    } transition-all flex items-center justify-center`}
                  >
                    <span className="mr-2">Brouillon</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('published')}
                    className={`py-2 px-4 rounded-md border ${
                      status === 'published'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background/50 border-border hover:bg-accent/30'
                    } transition-all flex items-center justify-center`}
                  >
                    <span className="mr-2">Publié</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('cancelled')}
                    className={`py-2 px-4 rounded-md border ${
                      status === 'cancelled'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background/50 border-border hover:bg-accent/30'
                    } transition-all flex items-center justify-center`}
                  >
                    <span className="mr-2">Annulé</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('completed')}
                    className={`py-2 px-4 rounded-md border ${
                      status === 'completed'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background/50 border-border hover:bg-accent/30'
                    } transition-all flex items-center justify-center`}
                  >
                    <span className="mr-2">Terminé</span>
                  </button>
                </div>
              </div>
              
              {/* Boutons d&apos;action */}
              <div className="flex justify-between pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-4 py-2 bg-destructive text-white rounded-md hover:bg-destructive/90 transition-all flex items-center"
                  disabled={isSaving}
                >
                  <Trash2 className="w-5 h-5 mr-2" />
                  Supprimer
                </button>
                
                <div className="flex space-x-2">
                  <Link
                    href={`/dashboard/events/${eventId}`}
                    className="px-4 py-2 border border-border rounded-md hover:bg-accent/50 transition-all"
                  >
                    Annuler
                  </Link>
                  
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-all flex items-center"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
          
          {/* Panneau latéral */}
          <div className="space-y-6">
            {/* Statut actuel */}
            <div className="glass p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-4">Statut actuel</h2>
              <div className="flex items-center">
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusClass(status)}`}>
                  {getStatusLabel(status)}
                </span>
              </div>
              
              {status === 'draft' && (
                <div className="mt-4 flex items-start">
                  <Info className="w-5 h-5 mr-2 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    En mode brouillon, l&apos;événement n&apos;est visible que par vous. Publiez-le pour le rendre visible aux participants.
                  </p>
                </div>
              )}
              
              {status === 'published' && (
                <div className="mt-4 flex items-start">
                  <Info className="w-5 h-5 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    L&apos;événement est publié et visible par les participants potentiels.
                  </p>
                </div>
              )}
              
              {status === 'cancelled' && (
                <div className="mt-4 flex items-start">
                  <AlertTriangle className="w-5 h-5 mr-2 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    L&apos;événement est annulé. Les participants seront notifiés de l&apos;annulation.
                  </p>
                </div>
              )}
              
              {status === 'completed' && (
                <div className="mt-4 flex items-start">
                  <Check className="w-5 h-5 mr-2 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    L&apos;événement est terminé. Vous pouvez toujours accéder aux informations et aux statistiques.
                  </p>
                </div>
              )}
            </div>
            
            {/* Conseils */}
            <div className="glass p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-4">Conseils</h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Donnez un titre clair et descriptif à votre événement.</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Incluez toutes les informations importantes dans la description.</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Spécifiez le lieu exact pour faciliter l&apos;accès des participants.</span>
                </li>
                <li className="flex items-start">
                  <Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Définissez le bon groupe cible pour atteindre les bonnes personnes.</span>
                </li>
              </ul>
            </div>
            
            {/* Actions rapides */}
            <div className="glass p-6 rounded-xl">
              <h2 className="text-xl font-bold mb-4">Actions rapides</h2>
              <div className="space-y-2">
                <Link
                  href={`/dashboard/events/${eventId}`}
                  className="w-full py-2 px-4 bg-accent/50 rounded-md hover:bg-accent/70 transition-all flex items-center justify-center"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Retour à l&apos;événement
                </Link>
                
                <Link
                  href={`/dashboard/events/${eventId}/schedules`}
                  className="w-full py-2 px-4 bg-accent/50 rounded-md hover:bg-accent/70 transition-all flex items-center justify-center"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Gérer les feuilles de route
                </Link>
                
                <Link
                  href={`/dashboard/events/${eventId}/participants`}
                  className="w-full py-2 px-4 bg-accent/50 rounded-md hover:bg-accent/70 transition-all flex items-center justify-center"
                >
                  <Users className="w-5 h-5 mr-2" />
                  Gérer les participants
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modale de suppression */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass p-6 rounded-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Supprimer l&apos;événement</h2>
            <p className="text-muted-foreground mb-6">
              Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-border rounded-md hover:bg-accent/50 transition-all"
                disabled={isSaving}
              >
                Annuler
              </button>
              
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-destructive text-white rounded-md hover:bg-destructive/90 transition-all"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5 mr-2" />
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
