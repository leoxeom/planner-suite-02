'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSupabase } from '@/components/providers/supabase-provider';
import { toast } from 'react-hot-toast';
import { format, parseISO, parse, isValid, addMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  Save,
  X,
  ChevronLeft,
  AlertCircle,
  Check,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';

// Types pour le formulaire
type ScheduleFormData = {
  schedule_date: string;
  start_time: string;
  end_time: string;
  title: string;
  description: string;
  target_groups: string[];
  location: string;
  required_skills: string[];
  max_participants: number | null;
  is_mandatory: boolean;
  responsible_person: string;
};

type Event = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
};

type ExistingSchedule = {
  id: string;
  title: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
};

export default function NewSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { supabase, profile, executeAuthOperation } = useSupabase();
  const eventId = params.id as string;
  
  // État pour l'événement
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingSchedules, setExistingSchedules] = useState<ExistingSchedule[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);
  
  // État pour le formulaire
  const [formData, setFormData] = useState<ScheduleFormData>({
    schedule_date: searchParams.get('date') || '',
    start_time: '09:00',
    end_time: '12:00',
    title: '',
    description: '',
    target_groups: ['both'],
    location: '',
    required_skills: [],
    max_participants: null,
    is_mandatory: true,
    responsible_person: '',
  });
  
  // État pour la nouvelle compétence
  const [newSkill, setNewSkill] = useState('');
  
  // Charger l'événement
  useEffect(() => {
    const loadEvent = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, title, start_date, end_date')
          .eq('id', eventId)
          .single();
        
        if (error) throw error;
        
        setEvent(data);
        
        // Si aucune date n'est spécifiée, utiliser la date de début de l'événement
        if (!formData.schedule_date) {
          setFormData(prev => ({
            ...prev,
            schedule_date: format(parseISO(data.start_date), 'yyyy-MM-dd')
          }));
        }
        
        // Charger les feuilles de route existantes pour vérifier les conflits
        const { data: schedules, error: schedulesError } = await supabase
          .from('daily_schedules')
          .select('id, title, schedule_date, start_time, end_time')
          .eq('event_id', eventId);
        
        if (schedulesError) throw schedulesError;
        
        setExistingSchedules(schedules || []);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'événement:', error);
        toast.error('Erreur lors du chargement de l\'événement');
        router.push('/dashboard/events');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (eventId) {
      loadEvent();
    }
  }, [eventId, supabase, router, formData.schedule_date, searchParams]);
  
  // Fonction pour mettre à jour le formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseInt(value) : null) : value
    }));
    
    // Vérifier les conflits lorsque les horaires ou la date changent
    if (name === 'schedule_date' || name === 'start_time' || name === 'end_time') {
      checkConflicts();
    }
  };
  
  // Fonction pour gérer les cases à cocher
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Fonction pour gérer les groupes cibles
  const handleTargetGroupChange = (group: string) => {
    if (group === 'both') {
      // Si on sélectionne "both", on désélectionne les autres
      setFormData(prev => ({
        ...prev,
        target_groups: ['both']
      }));
    } else {
      // Si on sélectionne "artistes" ou "techniques", on désélectionne "both"
      setFormData(prev => {
        let newGroups = [...prev.target_groups];
        
        if (newGroups.includes(group)) {
          // Désélectionner le groupe
          newGroups = newGroups.filter(g => g !== group);
          
          // Si plus aucun groupe n'est sélectionné, sélectionner "both"
          if (newGroups.length === 0) {
            newGroups = ['both'];
          }
        } else {
          // Sélectionner le groupe et désélectionner "both"
          newGroups = newGroups.filter(g => g !== 'both');
          newGroups.push(group);
        }
        
        return {
          ...prev,
          target_groups: newGroups
        };
      });
    }
  };
  
  // Fonction pour ajouter une compétence requise
  const addSkill = () => {
    if (newSkill.trim() && !formData.required_skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        required_skills: [...prev.required_skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };
  
  // Fonction pour supprimer une compétence requise
  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      required_skills: prev.required_skills.filter(s => s !== skill)
    }));
  };
  
  // Fonction pour vérifier les conflits d'horaires
  const checkConflicts = () => {
    const { schedule_date, start_time, end_time } = formData;
    
    if (!schedule_date || !start_time || !end_time) {
      setConflicts([]);
      return;
    }
    
    // Convertir les heures en objets Date pour comparaison
    const startDateTime = parse(`${schedule_date} ${start_time}`, 'yyyy-MM-dd HH:mm', new Date());
    const endDateTime = parse(`${schedule_date} ${end_time}`, 'yyyy-MM-dd HH:mm', new Date());
    
    if (!isValid(startDateTime) || !isValid(endDateTime)) {
      setConflicts([]);
      return;
    }
    
    // Vérifier si l'heure de fin est après l'heure de début
    if (endDateTime <= startDateTime) {
      setConflicts(['L\'heure de fin doit être après l\'heure de début']);
      return;
    }
    
    // Vérifier les conflits avec les feuilles de route existantes
    const conflicts = existingSchedules
      .filter(schedule => schedule.schedule_date === schedule_date)
      .filter(schedule => {
        const existingStart = parse(`${schedule.schedule_date} ${schedule.start_time}`, 'yyyy-MM-dd HH:mm', new Date());
        const existingEnd = parse(`${schedule.schedule_date} ${schedule.end_time}`, 'yyyy-MM-dd HH:mm', new Date());
        
        // Vérifier si les plages horaires se chevauchent
        return (
          (startDateTime >= existingStart && startDateTime < existingEnd) ||
          (endDateTime > existingStart && endDateTime <= existingEnd) ||
          (startDateTime <= existingStart && endDateTime >= existingEnd)
        );
      })
      .map(schedule => `Conflit avec "${schedule.title}" (${schedule.start_time} - ${schedule.end_time})`);
    
    setConflicts(conflicts);
  };
  
  // Fonction pour soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier si l'utilisateur est un régisseur ou un admin
    if (profile?.role !== 'regisseur' && profile?.role !== 'admin') {
      toast.error('Vous n\'avez pas les permissions nécessaires');
      return;
    }
    
    // Vérifier les champs obligatoires
    if (!formData.schedule_date || !formData.start_time || !formData.end_time || !formData.title) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    // Vérifier les conflits
    if (conflicts.length > 0) {
      const confirmConflicts = confirm(`Attention : ${conflicts.length} conflit(s) détecté(s). Voulez-vous continuer quand même ?`);
      if (!confirmConflicts) return;
    }
    
    setIsSaving(true);
    
    try {
      await executeAuthOperation(async () => {
        const { data, error } = await supabase
          .from('daily_schedules')
          .insert({
            event_id: eventId,
            schedule_date: formData.schedule_date,
            start_time: formData.start_time,
            end_time: formData.end_time,
            title: formData.title,
            description: formData.description || null,
            target_groups: formData.target_groups,
            location: formData.location || null,
            required_skills: formData.required_skills.length > 0 ? formData.required_skills : null,
            max_participants: formData.max_participants,
            is_mandatory: formData.is_mandatory,
            responsible_person: formData.responsible_person || null,
            created_by: profile.id
          })
          .select()
          .single();
        
        if (error) throw error;
        
        toast.success('Feuille de route créée avec succès');
        
        // Rediriger vers la page des feuilles de route
        router.push(`/dashboard/events/${eventId}/schedules`);
      });
    } catch (error) {
      console.error('Erreur lors de la création de la feuille de route:', error);
      toast.error('Erreur lors de la création de la feuille de route');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Fonction pour obtenir la classe de groupe cible
  const getTargetGroupClass = (group: string) => {
    if (formData.target_groups.includes(group)) {
      return group === 'artistes'
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
        : group === 'techniques'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
    }
    return 'bg-accent/30 hover:bg-accent/50';
  };
  
  // Rendu de la page
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent p-4 md:p-8">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Link 
              href={`/dashboard/events/${eventId}/schedules`}
              className="text-muted-foreground hover:text-foreground flex items-center"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Retour aux feuilles de route
            </Link>
          </div>
          <h1 className="text-3xl font-bold mt-2">Nouvelle feuille de route</h1>
          <p className="text-muted-foreground">
            {event?.title || 'Chargement...'}
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <button 
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center px-4 py-2 rounded-lg ${
              showPreview 
                ? 'bg-primary/20 text-primary' 
                : 'bg-accent/50 text-foreground hover:bg-accent/70'
            }`}
          >
            {showPreview ? (
              <>
                <EyeOff className="w-5 h-5 mr-2" />
                Masquer la prévisualisation
              </>
            ) : (
              <>
                <Eye className="w-5 h-5 mr-2" />
                Prévisualiser
              </>
            )}
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Formulaire */}
          <div className={`glass rounded-xl p-6 ${showPreview ? 'lg:w-1/2' : 'w-full'}`}>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Date et horaires */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="schedule_date" className="block text-sm font-medium mb-1">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="schedule_date"
                      name="schedule_date"
                      value={formData.schedule_date}
                      onChange={handleChange}
                      min={event?.start_date ? format(parseISO(event.start_date), 'yyyy-MM-dd') : undefined}
                      max={event?.end_date ? format(parseISO(event.end_date), 'yyyy-MM-dd') : undefined}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="start_time" className="block text-sm font-medium mb-1">
                      Heure de début <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      id="start_time"
                      name="start_time"
                      value={formData.start_time}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="end_time" className="block text-sm font-medium mb-1">
                      Heure de fin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      id="end_time"
                      name="end_time"
                      value={formData.end_time}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                
                {/* Titre et description */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium mb-1">
                    Titre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Ex: Répétition générale"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Description détaillée de cette feuille de route..."
                    className="w-full px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>
                
                {/* Groupes cibles */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Groupes cibles <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleTargetGroupChange('artistes')}
                      className={`px-3 py-1 rounded-full text-sm flex items-center ${getTargetGroupClass('artistes')}`}
                    >
                      <Users className="w-4 h-4 mr-1" />
                      <span>Artistes</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleTargetGroupChange('techniques')}
                      className={`px-3 py-1 rounded-full text-sm flex items-center ${getTargetGroupClass('techniques')}`}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      <span>Techniques</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleTargetGroupChange('both')}
                      className={`px-3 py-1 rounded-full text-sm flex items-center ${getTargetGroupClass('both')}`}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      <span>Tous</span>
                    </button>
                  </div>
                </div>
                
                {/* Lieu et responsable */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium mb-1">
                      Lieu
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="Ex: Salle principale"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="responsible_person" className="block text-sm font-medium mb-1">
                      Responsable
                    </label>
                    <input
                      type="text"
                      id="responsible_person"
                      name="responsible_person"
                      value={formData.responsible_person}
                      onChange={handleChange}
                      placeholder="Ex: Jean Dupont"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                
                {/* Compétences requises */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Compétences requises
                  </label>
                  <div className="flex items-center mb-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="Ex: Éclairage, Son, etc."
                      className="flex-1 px-3 py-2 border border-border rounded-l-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="px-3 py-2 bg-primary text-white rounded-r-md hover:bg-primary/90"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {formData.required_skills.map((skill, index) => (
                      <div
                        key={index}
                        className="flex items-center px-3 py-1 bg-accent/50 rounded-full text-sm"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-2 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {formData.required_skills.length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        Aucune compétence requise
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Options supplémentaires */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="max_participants" className="block text-sm font-medium mb-1">
                      Nombre maximum de participants
                    </label>
                    <input
                      type="number"
                      id="max_participants"
                      name="max_participants"
                      value={formData.max_participants === null ? '' : formData.max_participants}
                      onChange={handleChange}
                      min="1"
                      placeholder="Illimité si vide"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_mandatory"
                        checked={formData.is_mandatory}
                        onChange={handleCheckboxChange}
                        className="mr-2 h-4 w-4"
                      />
                      <span>Présence obligatoire</span>
                    </label>
                  </div>
                </div>
                
                {/* Conflits */}
                {conflicts.length > 0 && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
                    <div className="flex items-center text-destructive mb-2">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      <span className="font-medium">
                        {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''} détecté{conflicts.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {conflicts.map((conflict, index) => (
                        <li key={index}>{conflict}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Boutons d'action */}
                <div className="flex justify-end space-x-2 pt-4 border-t border-border">
                  <Link
                    href={`/dashboard/events/${eventId}/schedules`}
                    className="px-4 py-2 rounded-md bg-accent/30 hover:bg-accent/50"
                  >
                    Annuler
                  </Link>
                  
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <div className="flex items-center">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        <span>Enregistrement...</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Save className="w-5 h-5 mr-2" />
                        <span>Enregistrer</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
          
          {/* Prévisualisation */}
          {showPreview && (
            <div className="glass rounded-xl p-6 lg:w-1/2">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Prévisualisation
              </h2>
              
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-accent/30 p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-lg">{formData.title || 'Sans titre'}</h3>
                      <div className="text-sm text-muted-foreground">
                        {formData.schedule_date ? format(parse(formData.schedule_date, 'yyyy-MM-dd', new Date()), 'EEEE dd MMMM yyyy', { locale: fr }) : 'Date non spécifiée'}
                      </div>
                    </div>
                    
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      formData.target_groups.includes('both')
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
                        : formData.target_groups.includes('artistes') && formData.target_groups.includes('techniques')
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                          : formData.target_groups.includes('artistes')
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                    }`}>
                      {formData.target_groups.includes('both')
                        ? 'Tous'
                        : formData.target_groups.includes('artistes') && formData.target_groups.includes('techniques')
                          ? 'Artistes & Techniques'
                          : formData.target_groups.includes('artistes')
                            ? 'Artistes'
                            : 'Techniques'}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <div className="flex items-center text-sm">
                      <Clock className="w-4 h-4 mr-1 text-muted-foreground" />
                      <span>
                        {formData.start_time} - {formData.end_time}
                      </span>
                    </div>
                    
                    {formData.location && (
                      <div className="flex items-center text-sm">
                        <AlertCircle className="w-4 h-4 mr-1 text-muted-foreground" />
                        <span>{formData.location}</span>
                      </div>
                    )}
                    
                    {formData.responsible_person && (
                      <div className="flex items-center text-sm">
                        <Users className="w-4 h-4 mr-1 text-muted-foreground" />
                        <span>Responsable: {formData.responsible_person}</span>
                      </div>
                    )}
                    
                    {formData.is_mandatory && (
                      <div className="flex items-center text-sm">
                        <Info className="w-4 h-4 mr-1 text-amber-500" />
                        <span className="text-amber-500 font-medium">Présence obligatoire</span>
                      </div>
                    )}
                  </div>
                  
                  {formData.description && (
                    <div className="pt-2 border-t border-border">
                      <h4 className="text-sm font-medium mb-1">Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {formData.description}
                      </p>
                    </div>
                  )}
                  
                  {formData.required_skills.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <h4 className="text-sm font-medium mb-1">Compétences requises</h4>
                      <div className="flex flex-wrap gap-2">
                        {formData.required_skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-accent/30 rounded-full text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {formData.max_participants !== null && (
                    <div className="pt-2 border-t border-border">
                      <h4 className="text-sm font-medium mb-1">Participants</h4>
                      <div className="flex items-center text-sm">
                        <Users className="w-4 h-4 mr-1 text-muted-foreground" />
                        <span>Maximum: {formData.max_participants} participant{formData.max_participants > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-3">Planning de la journée</h3>
                
                <div className="relative border border-border rounded-lg p-4 min-h-[200px]">
                  {/* Ligne de temps */}
                  <div className="absolute left-20 right-4 top-10 bottom-4">
                    {/* Heures */}
                    {Array.from({ length: 15 }, (_, i) => i + 8).map((hour) => (
                      <div key={hour} className="absolute border-t border-border text-xs text-muted-foreground" style={{ top: `${(hour - 8) * 40}px`, left: 0, right: 0 }}>
                        {hour}:00
                      </div>
                    ))}
                    
                    {/* Feuilles de route existantes */}
                    {existingSchedules
                      .filter(schedule => schedule.schedule_date === formData.schedule_date)
                      .map((schedule, index) => {
                        const startHour = parseInt(schedule.start_time.split(':')[0]);
                        const startMinute = parseInt(schedule.start_time.split(':')[1]);
                        const endHour = parseInt(schedule.end_time.split(':')[0]);
                        const endMinute = parseInt(schedule.end_time.split(':')[1]);
                        
                        const top = (startHour - 8) * 40 + (startMinute / 60) * 40;
                        const height = ((endHour - startHour) * 60 + (endMinute - startMinute)) / 60 * 40;
                        
                        return (
                          <div
                            key={index}
                            className="absolute left-0 right-0 bg-accent/30 border border-border rounded-md p-2 overflow-hidden"
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            <div className="text-xs font-medium truncate">{schedule.title}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {schedule.start_time} - {schedule.end_time}
                            </div>
                          </div>
                        );
                      })}
                    
                    {/* Nouvelle feuille de route */}
                    {formData.schedule_date && formData.start_time && formData.end_time && (
                      (() => {
                        const startHour = parseInt(formData.start_time.split(':')[0]);
                        const startMinute = parseInt(formData.start_time.split(':')[1]);
                        const endHour = parseInt(formData.end_time.split(':')[0]);
                        const endMinute = parseInt(formData.end_time.split(':')[1]);
                        
                        const top = (startHour - 8) * 40 + (startMinute / 60) * 40;
                        const height = ((endHour - startHour) * 60 + (endMinute - startMinute)) / 60 * 40;
                        
                        const hasConflict = conflicts.length > 0;
                        
                        return (
                          <div
                            className={`absolute left-0 right-0 border rounded-md p-2 overflow-hidden ${
                              hasConflict
                                ? 'bg-destructive/20 border-destructive/50'
                                : 'bg-primary/20 border-primary/50'
                            }`}
                            style={{ top: `${top}px`, height: `${height}px` }}
                          >
                            <div className="text-xs font-medium truncate">{formData.title || 'Nouvelle feuille de route'}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {formData.start_time} - {formData.end_time}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
