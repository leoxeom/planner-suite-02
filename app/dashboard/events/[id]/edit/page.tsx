'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/components/providers/supabase-provider';
import { toast } from 'react-hot-toast';
import { format, addHours, isAfter, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Save,
  Eye,
  ArrowLeft,
  AlertCircle,
  Clock,
  CalendarRange,
  Info,
  CheckCircle,
  X,
  FileText,
  Loader2,
  Edit,
  Plus,
  History,
} from 'lucide-react';

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const { supabase, profile, executeAuthOperation } = useSupabase();
  const eventId = params.id as string;

  // États du formulaire
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_date: format(addHours(new Date(), 24), "yyyy-MM-dd'T'HH:mm"),
    location: '',
    budget: '',
    max_participants: '',
    target_group: 'both',
    status: 'draft',
  });

  // États pour les suggestions et la validation
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previousLocations, setPreviousLocations] = useState<string[]>([]);
  const [eventHistory, setEventHistory] = useState<any[]>([]);
  const [originalEvent, setOriginalEvent] = useState<any>(null);

  // Charger les données de l'événement et les lieux précédents
  useEffect(() => {
    const loadEventAndLocations = async () => {
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

          // Vérifier les permissions
          if (profile && eventData.created_by !== profile.id && profile.role !== 'admin') {
            toast.error('Vous n\'avez pas les permissions nécessaires pour modifier cet événement');
            router.push(`/dashboard/events/${eventId}`);
            return;
          }

          setFormData({
            title: eventData.title || '',
            description: eventData.description || '',
            start_date: format(parseISO(eventData.start_date), "yyyy-MM-dd'T'HH:mm"),
            end_date: format(parseISO(eventData.end_date), "yyyy-MM-dd'T'HH:mm"),
            location: eventData.location || '',
            budget: eventData.budget !== null ? String(eventData.budget) : '',
            max_participants: eventData.max_participants !== null ? String(eventData.max_participants) : '',
            target_group: eventData.target_group || 'both',
            status: eventData.status || 'draft',
          });

          setOriginalEvent(eventData);

          // Récupérer l'historique des modifications (simulé pour le moment)
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

          // Charger les lieux précédents
          const { data: locationsData, error: locationsError } = await supabase
            .from('events')
            .select('location')
            .not('location', 'is', null)
            .order('created_at', { ascending: false })
            .limit(10);

          if (locationsError) throw locationsError;

          const uniqueLocations = Array.from(
            new Set(locationsData.map(item => item.location).filter(Boolean))
          );
          setPreviousLocations(uniqueLocations);
        });
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        toast.error('Erreur lors du chargement des données');
        router.push('/dashboard/events'); // Rediriger si l'événement n'existe pas ou erreur
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId && profile) { // Assurez-vous que le profil est chargé
      loadEventAndLocations();
    }
  }, [eventId, supabase, profile, router, executeAuthOperation]);

  // Gérer les changements de champs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Réinitialiser l'erreur pour ce champ
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Gérer les suggestions de lieux
    if (name === 'location' && value.trim() !== '') {
      const filteredSuggestions = previousLocations.filter(
        loc => loc.toLowerCase().includes(value.toLowerCase())
      );
      setLocationSuggestions(filteredSuggestions);
      setShowSuggestions(filteredSuggestions.length > 0);
    } else if (name === 'location') {
      setShowSuggestions(false);
    }
  };

  // Sélectionner une suggestion de lieu
  const selectSuggestion = (suggestion: string) => {
    setFormData(prev => ({
      ...prev,
      location: suggestion
    }));
    setShowSuggestions(false);
  };

  // Valider le formulaire
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validation du titre
    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Le titre ne doit pas dépasser 255 caractères';
    }

    // Validation des dates
    if (!formData.start_date) {
      newErrors.start_date = 'La date de début est requise';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'La date de fin est requise';
    } else if (
      formData.start_date &&
      formData.end_date &&
      isAfter(parseISO(formData.start_date), parseISO(formData.end_date))
    ) {
      newErrors.end_date = 'La date de fin doit être après la date de début';
    }

    // Validation du budget (si fourni)
    if (formData.budget && isNaN(Number(formData.budget))) {
      newErrors.budget = 'Le budget doit être un nombre';
    } else if (formData.budget && Number(formData.budget) < 0) {
      newErrors.budget = 'Le budget ne peut pas être négatif';
    }

    // Validation du nombre de participants (si fourni)
    if (formData.max_participants && isNaN(Number(formData.max_participants))) {
      newErrors.max_participants = 'Le nombre de participants doit être un nombre';
    } else if (formData.max_participants && Number(formData.max_participants) <= 0) {
      newErrors.max_participants = 'Le nombre de participants doit être supérieur à 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Soumettre le formulaire
  const handleSubmit = async (status: 'draft' | 'published') => {
    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    setIsSaving(true);

    try {
      await executeAuthOperation(async () => {
        const eventData = {
          title: formData.title,
          description: formData.description,
          status,
          target_group: formData.target_group,
          start_date: formData.start_date,
          end_date: formData.end_date,
          location: formData.location || null,
          budget: formData.budget ? Number(formData.budget) : null,
          max_participants: formData.max_participants ? Number(formData.max_participants) : null,
          published_at: status === 'published' ? new Date().toISOString() : null,
        };

        const { data, error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', eventId)
          .select()
          .single();

        if (error) throw error;

        toast.success(`Événement ${status === 'published' ? 'publié' : 'enregistré en brouillon'} avec succès`);

        // Rediriger vers la page de détail
        router.push(`/dashboard/events/${data.id}`);
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'événement:', error);
      toast.error('Erreur lors de la mise à jour de l\'événement');
    } finally {
      setIsSaving(false);
    }
  };

  // Obtenir l'icône du groupe cible
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
        return <Eye className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold">Modifier l'événement</h1>
          <p className="text-muted-foreground mt-1">
            Mettez à jour les informations de votre événement
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulaire principal */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Informations générales</h2>
            
            {/* Titre */}
            <div className="mb-4">
              <label htmlFor="title" className="block font-medium mb-1">
                Titre <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Nom de l'événement"
                className={`w-full px-4 py-2 border ${
                  errors.title ? 'border-destructive' : 'border-border'
                } rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary`}
                required
              />
              {errors.title && (
                <p className="text-destructive text-sm mt-1">{errors.title}</p>
              )}
            </div>
            
            {/* Description */}
            <div className="mb-4">
              <label htmlFor="description" className="block font-medium mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Description détaillée de l'événement"
                rows={4}
                className="w-full px-4 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="start_date" className="block font-medium mb-1">
                  Date et heure de début <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <CalendarRange className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border ${
                      errors.start_date ? 'border-destructive' : 'border-border'
                    } rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary`}
                    required
                  />
                </div>
                {errors.start_date && (
                  <p className="text-destructive text-sm mt-1">{errors.start_date}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="end_date" className="block font-medium mb-1">
                  Date et heure de fin <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="datetime-local"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border ${
                      errors.end_date ? 'border-destructive' : 'border-border'
                    } rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary`}
                    required
                  />
                </div>
                {errors.end_date && (
                  <p className="text-destructive text-sm mt-1">{errors.end_date}</p>
                )}
              </div>
            </div>
            
            {/* Lieu */}
            <div className="mb-4">
              <label htmlFor="location" className="block font-medium mb-1">
                Lieu
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="Adresse ou nom du lieu"
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                  onFocus={() => setShowSuggestions(locationSuggestions.length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                
                {/* Suggestions de lieux */}
                {showSuggestions && (
                  <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {locationSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-accent/50 cursor-pointer"
                        onClick={() => selectSuggestion(suggestion)}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {previousLocations.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground mb-1">Lieux récents :</p>
                  <div className="flex flex-wrap gap-2">
                    {previousLocations.slice(0, 5).map((location, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectSuggestion(location)}
                        className="px-3 py-1 text-xs bg-accent/30 rounded-full hover:bg-accent/50"
                      >
                        {location}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Paramètres supplémentaires */}
          <div className="glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Paramètres supplémentaires</h2>
            
            {/* Groupe cible */}
            <div className="mb-4">
              <label htmlFor="target_group" className="block font-medium mb-1">
                Groupe cible <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['artistes', 'techniques', 'both'].map((group) => (
                  <label
                    key={group}
                    className={`flex items-center p-3 border ${
                      formData.target_group === group 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:bg-accent/30'
                    } rounded-lg cursor-pointer transition-all`}
                  >
                    <input
                      type="radio"
                      name="target_group"
                      value={group}
                      checked={formData.target_group === group}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full ${
                        formData.target_group === group 
                          ? 'bg-primary/20' 
                          : 'bg-accent/30'
                        } flex items-center justify-center mr-2`}>
                        {getTargetGroupIcon(group)}
                      </div>
                      <div>
                        <span className="font-medium">
                          {group === 'artistes' 
                            ? 'Artistes' 
                            : group === 'techniques' 
                              ? 'Techniques' 
                              : 'Tous'
                          }
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {group === 'artistes' 
                            ? 'Uniquement pour les artistes' 
                            : group === 'techniques' 
                              ? 'Uniquement pour l\'équipe technique' 
                              : 'Pour tous les participants'
                          }
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Budget et participants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="budget" className="block font-medium mb-1">
                  Budget (€)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="number"
                    id="budget"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    placeholder="Budget estimé"
                    min="0"
                    step="0.01"
                    className={`w-full pl-10 pr-4 py-2 border ${
                      errors.budget ? 'border-destructive' : 'border-border'
                    } rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary`}
                  />
                </div>
                {errors.budget && (
                  <p className="text-destructive text-sm mt-1">{errors.budget}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="max_participants" className="block font-medium mb-1">
                  Nombre maximum de participants
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="number"
                    id="max_participants"
                    name="max_participants"
                    value={formData.max_participants}
                    onChange={handleChange}
                    placeholder="Nombre max. de participants"
                    min="1"
                    className={`w-full pl-10 pr-4 py-2 border ${
                      errors.max_participants ? 'border-destructive' : 'border-border'
                    } rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary`}
                  />
                </div>
                {errors.max_participants && (
                  <p className="text-destructive text-sm mt-1">{errors.max_participants}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col md:flex-row justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-border rounded-lg hover:bg-accent/50 transition-all flex items-center justify-center"
              disabled={isSaving}
            >
              <X className="w-5 h-5 mr-2" />
              Annuler
            </button>
            
            <button
              type="button"
              onClick={() => handleSubmit('draft')}
              className="px-6 py-2 bg-accent/50 rounded-lg hover:bg-accent/70 transition-all flex items-center justify-center"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Enregistrer en brouillon
            </button>
            
            <button
              type="button"
              onClick={() => handleSubmit('published')}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all flex items-center justify-center hover-lift"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Eye className="w-5 h-5 mr-2" />
              )}
              Publier
            </button>
          </div>
        </div>
        
        {/* Panneau latéral */}
        <div className="space-y-6">
          {/* Statut actuel */}
          <div className="glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Statut actuel</h2>
            <div className="flex items-center mb-4">
              <span className={`px-3 py-1 rounded-full text-sm ${
                originalEvent?.status === 'draft' 
                  ? 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                  : originalEvent?.status === 'published'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                    : originalEvent?.status === 'cancelled'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
              }`}>
                {originalEvent?.status === 'draft' 
                  ? 'Brouillon' 
                  : originalEvent?.status === 'published'
                    ? 'Publié'
                    : originalEvent?.status === 'cancelled'
                      ? 'Annulé'
                      : originalEvent?.status === 'completed'
                        ? 'Terminé'
                        : 'Inconnu'
                }
              </span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Dernière modification : {originalEvent ? format(parseISO(originalEvent.updated_at), 'dd/MM/yyyy à HH:mm') : ''}
            </p>
            
            {originalEvent?.published_at && (
              <p className="text-sm text-muted-foreground mt-1">
                Publié le : {format(parseISO(originalEvent.published_at), 'dd/MM/yyyy à HH:mm')}
              </p>
            )}
          </div>
          
          {/* Historique des modifications */}
          <div className="glass p-6 rounded-xl">
            <div className="flex items-center mb-4">
              <History className="w-5 h-5 mr-2" />
              <h2 className="text-xl font-bold">Historique</h2>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {eventHistory.map((historyItem) => (
                <div 
                  key={historyItem.id}
                  className="p-3 rounded-lg bg-accent/20 hover:bg-accent/30 transition-all"
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
          
          {/* Prévisualisation */}
          <div className="glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Prévisualisation</h2>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-accent/20">
                <h3 className="font-medium text-lg">
                  {formData.title || 'Titre de l\'événement'}
                </h3>
                
                <div className="mt-2 space-y-2">
                  <div className="flex items-center text-sm">
                    <CalendarRange className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>
                      {formData.start_date 
                        ? format(parseISO(formData.start_date), 'dd/MM/yyyy HH:mm')
                        : 'Date de début'}
                      {' - '}
                      {formData.end_date
                        ? format(parseISO(formData.end_date), 'dd/MM/yyyy HH:mm')
                        : 'Date de fin'}
                    </span>
                  </div>
                  
                  {formData.location && (
                    <div className="flex items-center text-sm">
                      <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span>{formData.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm">
                    {getTargetGroupIcon(formData.target_group)}
                    <span className="ml-2">
                      {formData.target_group === 'artistes' 
                        ? 'Artistes' 
                        : formData.target_group === 'techniques' 
                          ? 'Techniques' 
                          : 'Tous'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Aide et conseils */}
          <div className="glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4">Conseils</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-primary mr-2 mt-0.5" />
                <p className="text-sm">
                  <span className="font-medium">Modifications</span> : Toutes les modifications sont enregistrées dans l'historique de l'événement.
                </p>
              </div>
              
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-amber-500 mr-2 mt-0.5" />
                <p className="text-sm">
                  Si vous passez un événement publié en brouillon, il ne sera plus visible par les intermittents.
                </p>
              </div>
              
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                <p className="text-sm">
                  Les participants déjà inscrits seront notifiés des modifications importantes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
