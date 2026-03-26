import { useCallback, useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/ctx/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Appointment = {
  id: string;
  scheduled_at: string;
  status: string;
  notes?: string | null;
  client?: any;
  vehicle?: any;
  service?: any;
};

const THEME = {
  bg: '#F9FAFB',
  text: '#111827',
  textSoft: '#6B7280',
  primary: '#fb8500',   // Orange
  secondary: '#023047', // Navy
  card: '#FFFFFF',
  border: '#E5E7EB',
  danger: '#EF4444',
  success: '#10B981',
};

export default function WorkshopAgendaScreen() {
  const { isWorkshop } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: staffData } = await supabase
        .from('workshop_staff')
        .select('workshop_id')
        .eq('user_id', user.id)
        .single();

      if (!staffData?.workshop_id) return;

      const { data: appointmentData } = await supabase
        .from('appointments')
        .select(`
          id, 
          scheduled_at, 
          status, 
          notes,
          client:clients(first_name, last_name),
          vehicle:vehicles(make, model, license_plate),
          service:service_catalog(name)
        `)
        .eq('workshop_id', staffData.workshop_id)
        .order('scheduled_at', { ascending: true })
        .limit(50);

      setAppointments((appointmentData || []) as Appointment[]);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isWorkshop) {
      loadData();
    } else {
      setLoading(false); // don't freeze infinitely if not workshop
    }
  }, [loadData, isWorkshop]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  async function handleUpdateStatus(appointmentId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      
      setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a));
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo actualizar el estado de la cita.');
    }
  }

  if (!isWorkshop) return null;

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Agenda' }} />
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Agenda del Taller', 
        headerTintColor: 'white',
        headerTransparent: false,
        headerStyle: { backgroundColor: THEME.secondary },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '900', fontSize: 20 },
      }} />

      <View style={[styles.topBlueWrapper, { paddingTop: insets.top + 20 }]}>
         <Text style={styles.agendaTitle}>Citas Próximas</Text>
         <Text style={styles.agendaSubtitle}>Monitorea el ingreso de vehículos</Text>
      </View>

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onRefresh={onRefresh}
        refreshing={refreshing}
        ListHeaderComponent={<View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={styles.appointmentCard}>
            <View style={styles.appointmentHeaderRow}>
              <View style={styles.dateCircle}>
                <Text style={styles.dateDay}>{new Date(item.scheduled_at).getDate()}</Text>
                <Text style={styles.dateMonth}>
                  {new Date(item.scheduled_at).toLocaleString('default', { month: 'short' }).toUpperCase()}
                </Text>
              </View>
              <View style={styles.appointmentInfo}>
                <View>
                  <Text style={styles.appointmentTime}>
                    {new Date(item.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.clientName}>{(item as any).client?.first_name} {(item as any).client?.last_name}</Text>
                </View>
                <View style={[styles.statusBadge, { 
                  backgroundColor: 
                    item.status === 'completed' ? '#D1FAE5' : 
                    item.status === 'cancelled' ? '#FEE2E2' : 
                    item.status === 'approved' ? '#DBEAFE' : '#FEF3C7' 
                }]}>
                  <Text style={[styles.statusText, { 
                    color: 
                      item.status === 'completed' ? '#065F46' : 
                      item.status === 'cancelled' ? '#B91C1C' : 
                      item.status === 'approved' ? '#1E40AF' : '#92400E' 
                  }]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.appointmentDetailsBox}>
               <Text style={styles.detailText}>
                 <Ionicons name="car" size={16} color={THEME.primary} />  {(item as any).vehicle?.make} {(item as any).vehicle?.model} ({(item as any).vehicle?.license_plate})
               </Text>
               <Text style={styles.detailText}>
                 <Ionicons name="construct" size={16} color={THEME.primary} />  {(item as any).service?.name || 'Servicio General'}
               </Text>
            </View>

            {item.notes && (
              <View style={styles.appointmentNotesBox}>
                <Text style={styles.appointmentNotes}>"{item.notes}"</Text>
              </View>
            )}

            <View style={styles.statusActions}>
               {item.status === 'scheduled' && (
                 <TouchableOpacity 
                   style={[styles.smallActionBtn, { backgroundColor: THEME.primary }]}
                   onPress={() => handleUpdateStatus(item.id, 'confirmed')}
                 >
                   <Text style={styles.smallActionBtnText}>Aceptar Cita</Text>
                 </TouchableOpacity>
               )}
               {item.status === 'confirmed' && (
                 <TouchableOpacity 
                   style={[styles.smallActionBtn, { backgroundColor: THEME.success }]}
                   onPress={() => handleUpdateStatus(item.id, 'completed')}
                 >
                   <Text style={styles.smallActionBtnText}>Finalizar  Trabajo</Text>
                 </TouchableOpacity>
               )}
               {item.status !== 'completed' && item.status !== 'cancelled' && (
                 <TouchableOpacity 
                   style={styles.cancelBtn}
                   onPress={() => handleUpdateStatus(item.id, 'cancelled')}
                 >
                   <Text style={styles.cancelBtnText}>Rechazar / Cancelar</Text>
                 </TouchableOpacity>
               )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
             <Ionicons name="calendar-outline" size={60} color={THEME.border} />
             <Text style={styles.emptyTitle}>Tu agenda está libre</Text>
             <Text style={styles.emptyText}>Las nuevas solicitudes de tus clientes llegarán aquí.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  topBlueWrapper: {
    backgroundColor: THEME.secondary,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40, 
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 10,
  },
  agendaTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: 'white',
    marginBottom: 4,
  },
  agendaSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 80,
  },
  appointmentCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  appointmentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dateCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 133, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 133, 0, 0.2)',
  },
  dateDay: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.primary,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.primary,
    letterSpacing: 1,
  },
  appointmentInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentTime: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.text,
  },
  clientName: {
    fontSize: 14,
    color: THEME.textSoft,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  appointmentDetailsBox: {
    marginTop: 16,
    backgroundColor: THEME.bg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 10,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
    color: THEME.secondary,
  },
  appointmentNotesBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  appointmentNotes: {
    fontSize: 14,
    color: '#92400E',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: THEME.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.secondary,
    marginBottom: 8,
    marginTop: 16,
  },
  emptyText: {
    color: THEME.textSoft,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 14,
  },
  statusActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
    justifyContent: 'flex-end',
  },
  smallActionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  smallActionBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '900',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '900',
  },
});
