import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  Image, 
  Font, 
  PDFDownloadLink,
  pdf 
} from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

// Enregistrement des polices pour supporter les caractères français
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 'normal' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 'bold' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf', fontStyle: 'italic' },
  ],
});

// Types pour les données
export type SchedulePDFProps = {
  event: {
    id: string;
    title: string;
    start_date: string;
    end_date: string;
    location?: string;
  };
  schedules: {
    id: string;
    schedule_date: string;
    start_time: string;
    end_time: string;
    title: string;
    description?: string;
    target_groups: string[];
    location?: string;
    responsible_person?: string;
    is_mandatory: boolean;
    required_skills?: string[];
  }[];
  options: {
    includeDetails: boolean;
    includeParticipants: boolean;
    includeLogo: boolean;
    targetGroups: string[];
    logoUrl?: string;
    companyName?: string;
  };
};

// Styles pour le PDF
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Roboto',
    padding: 30,
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
    paddingBottom: 10,
    alignItems: 'center',
  },
  headerLogo: {
    width: 60,
    height: 60,
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666666',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    backgroundColor: '#F0F0F0',
    padding: 5,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    backgroundColor: '#E0E0E0',
    padding: 8,
    borderRadius: 3,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
  },
  tableRowEven: {
    backgroundColor: '#F9F9F9',
  },
  tableHeader: {
    backgroundColor: '#E0E0E0',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: '#CCCCCC',
  },
  tableCellTime: {
    width: '15%',
  },
  tableCellTitle: {
    width: '35%',
  },
  tableCellLocation: {
    width: '20%',
  },
  tableCellTarget: {
    width: '15%',
  },
  tableCellResponsible: {
    width: '15%',
  },
  detailsContainer: {
    marginTop: 5,
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#CCCCCC',
  },
  detailsTitle: {
    fontWeight: 'bold',
    marginBottom: 3,
  },
  detailsText: {
    fontSize: 10,
    color: '#444444',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  skillBadge: {
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    padding: '2 5',
    marginRight: 5,
    marginBottom: 3,
    fontSize: 8,
  },
  mandatoryBadge: {
    backgroundColor: '#FFF0C0',
    color: '#806000',
    padding: '2 5',
    borderRadius: 2,
    fontSize: 8,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#CCCCCC',
    paddingTop: 10,
    fontSize: 10,
    color: '#666666',
    textAlign: 'center',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    fontSize: 10,
    color: '#666666',
  },
  targetGroupArtistes: {
    color: '#1E40AF',
    backgroundColor: '#DBEAFE',
    padding: '2 5',
    borderRadius: 2,
    fontSize: 8,
  },
  targetGroupTechniques: {
    color: '#854D0E',
    backgroundColor: '#FEF3C7',
    padding: '2 5',
    borderRadius: 2,
    fontSize: 8,
  },
  targetGroupBoth: {
    color: '#6B21A8',
    backgroundColor: '#F3E8FF',
    padding: '2 5',
    borderRadius: 2,
    fontSize: 8,
  },
});

// Composant Header
const Header = ({ event, options }: { event: SchedulePDFProps['event'], options: SchedulePDFProps['options'] }) => (
  <View style={styles.header} fixed>
    {options.includeLogo && options.logoUrl && (
      <Image src={options.logoUrl} style={styles.headerLogo} />
    )}
    <View style={styles.headerContent}>
      <Text style={styles.headerTitle}>{event.title}</Text>
      <Text style={styles.headerSubtitle}>
        Du {format(parseISO(event.start_date), 'dd MMMM yyyy', { locale: fr })} au {format(parseISO(event.end_date), 'dd MMMM yyyy', { locale: fr })}
      </Text>
      {event.location && (
        <Text style={styles.headerSubtitle}>Lieu: {event.location}</Text>
      )}
      {options.companyName && (
        <Text style={styles.headerSubtitle}>{options.companyName}</Text>
      )}
    </View>
  </View>
);

// Composant pour le tableau des feuilles de route
const ScheduleTable = ({ 
  daySchedules, 
  options 
}: { 
  daySchedules: SchedulePDFProps['schedules'], 
  options: SchedulePDFProps['options'] 
}) => (
  <View style={styles.table}>
    {/* En-tête du tableau */}
    <View style={[styles.tableRow, styles.tableHeader]}>
      <View style={[styles.tableCell, styles.tableCellTime]}>
        <Text>Horaire</Text>
      </View>
      <View style={[styles.tableCell, styles.tableCellTitle]}>
        <Text>Titre</Text>
      </View>
      <View style={[styles.tableCell, styles.tableCellLocation]}>
        <Text>Lieu</Text>
      </View>
      <View style={[styles.tableCell, styles.tableCellTarget]}>
        <Text>Groupe</Text>
      </View>
      <View style={[styles.tableCell, styles.tableCellResponsible]}>
        <Text>Responsable</Text>
      </View>
    </View>
    
    {/* Lignes du tableau */}
    {daySchedules.map((schedule, index) => (
      <React.Fragment key={schedule.id}>
        <View style={[
          styles.tableRow, 
          index % 2 === 1 ? styles.tableRowEven : {}
        ]}>
          <View style={[styles.tableCell, styles.tableCellTime]}>
            <Text>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</Text>
          </View>
          <View style={[styles.tableCell, styles.tableCellTitle]}>
            <Text>{schedule.title}</Text>
            {schedule.is_mandatory && (
              <Text style={styles.mandatoryBadge}>Obligatoire</Text>
            )}
          </View>
          <View style={[styles.tableCell, styles.tableCellLocation]}>
            <Text>{schedule.location || '-'}</Text>
          </View>
          <View style={[styles.tableCell, styles.tableCellTarget]}>
            <Text style={getTargetGroupStyle(schedule.target_groups)}>
              {getTargetGroupLabel(schedule.target_groups)}
            </Text>
          </View>
          <View style={[styles.tableCell, styles.tableCellResponsible]}>
            <Text>{schedule.responsible_person || '-'}</Text>
          </View>
        </View>
        
        {/* Détails supplémentaires si demandé */}
        {options.includeDetails && (schedule.description || (schedule.required_skills && schedule.required_skills.length > 0)) && (
          <View style={[styles.tableRow, index % 2 === 1 ? styles.tableRowEven : {}]}>
            <View style={[styles.tableCell, { width: '100%' }]}>
              <View style={styles.detailsContainer}>
                {schedule.description && (
                  <>
                    <Text style={styles.detailsTitle}>Description:</Text>
                    <Text style={styles.detailsText}>{schedule.description}</Text>
                  </>
                )}
                
                {schedule.required_skills && schedule.required_skills.length > 0 && (
                  <>
                    <Text style={[styles.detailsTitle, { marginTop: 5 }]}>Compétences requises:</Text>
                    <View style={styles.skillsContainer}>
                      {schedule.required_skills.map((skill, i) => (
                        <Text key={i} style={styles.skillBadge}>{skill}</Text>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
        )}
      </React.Fragment>
    ))}
  </View>
);

// Composant Footer
const Footer = ({ pageNumber }: { pageNumber: number }) => (
  <View fixed>
    <Text style={styles.footer}>
      Feuille de route générée le {format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}
    </Text>
    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
      `${pageNumber} / ${totalPages}`
    )} />
  </View>
);

// Composant principal du PDF
const SchedulePDF = ({ event, schedules, options }: SchedulePDFProps) => {
  // Filtrer les feuilles de route par groupe cible si nécessaire
  const filteredSchedules = options.targetGroups.length > 0
    ? schedules.filter(schedule => 
        options.targetGroups.some(group => 
          schedule.target_groups.includes(group) || schedule.target_groups.includes('both')
        )
      )
    : schedules;
  
  // Grouper les feuilles de route par jour
  const schedulesByDay: Record<string, typeof schedules> = {};
  filteredSchedules.forEach(schedule => {
    if (!schedulesByDay[schedule.schedule_date]) {
      schedulesByDay[schedule.schedule_date] = [];
    }
    schedulesByDay[schedule.schedule_date].push(schedule);
  });
  
  // Trier les jours
  const sortedDays = Object.keys(schedulesByDay).sort();
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Header event={event} options={options} />
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feuille de Route</Text>
          
          {sortedDays.length === 0 ? (
            <Text>Aucune feuille de route disponible pour les critères sélectionnés.</Text>
          ) : (
            sortedDays.map(day => (
              <View key={day}>
                <Text style={styles.dayTitle}>
                  {format(parseISO(day), 'EEEE dd MMMM yyyy', { locale: fr })}
                </Text>
                <ScheduleTable 
                  daySchedules={schedulesByDay[day]} 
                  options={options} 
                />
              </View>
            ))
          )}
        </View>
        
        <Footer pageNumber={1} />
      </Page>
    </Document>
  );
};

// Fonctions utilitaires
const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  return `${hours}h${minutes}`;
};

const getTargetGroupLabel = (groups: string[]) => {
  if (groups.includes('both')) {
    return 'Tous';
  } else if (groups.includes('artistes') && groups.includes('techniques')) {
    return 'Artistes & Tech.';
  } else if (groups.includes('artistes')) {
    return 'Artistes';
  } else if (groups.includes('techniques')) {
    return 'Techniques';
  }
  return 'Non spécifié';
};

const getTargetGroupStyle = (groups: string[]) => {
  if (groups.includes('both')) {
    return styles.targetGroupBoth;
  } else if (groups.includes('artistes') && groups.includes('techniques')) {
    return styles.targetGroupBoth;
  } else if (groups.includes('artistes')) {
    return styles.targetGroupArtistes;
  } else if (groups.includes('techniques')) {
    return styles.targetGroupTechniques;
  }
  return {};
};

// Fonction pour générer un lien de téléchargement PDF
export const SchedulePDFDownloadLink = ({ 
  event, 
  schedules, 
  options,
  fileName = 'feuille-de-route.pdf',
  children
}: SchedulePDFProps & { 
  fileName?: string;
  children: React.ReactNode;
}) => (
  <PDFDownloadLink 
    document={<SchedulePDF event={event} schedules={schedules} options={options} />} 
    fileName={fileName}
  >
    {({ blob, url, loading, error }) => children}
  </PDFDownloadLink>
);

// Fonction pour générer un PDF et le retourner sous forme de blob
export const generateSchedulePDF = async (
  event: SchedulePDFProps['event'], 
  schedules: SchedulePDFProps['schedules'], 
  options: SchedulePDFProps['options']
) => {
  return await pdf(<SchedulePDF event={event} schedules={schedules} options={options} />).toBlob();
};

export default SchedulePDF;
