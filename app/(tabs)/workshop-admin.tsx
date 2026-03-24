import { useCallback, useEffect, useState, useRef } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/ctx/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
const { width, height } = Dimensions.get('window');

type WorkshopContext = {
  workshopId: string;
  workshopName: string;
};

type Appointment = {
  id: string;
  scheduled_at: string;
  status: string;
  notes?: string | null;
};

type Service = {
  id: string;
  name: string;
};

const THEME = {
  bg: '#FFFFFF',
  text: '#111827',
  textSoft: '#6B7280',
  primary: '#219ebc',
  secondary: '#023047',
  accent: '#8ecae6',
  card: '#F9FAFB',
  border: '#E5E7EB',
  danger: '#EF4444',
  success: '#10B981',
};

const CATEGORIES = [
  'Mecánica General',
  'Eléctrico',
  'Frenos',
  'Suspensión',
  'Afinación',
  'Hojalatería',
  'Pintura',
  'Llantas',
  'Detallado',
  'Aire Acondicionado'
];

const PAYMENT_METHODS = [
  'Efectivo',
  'Tarjeta de Crédito/Débito',
  'Transferencia',
  'Mercado Pago'
];

export default function WorkshopAdminScreen() {
  const { isWorkshop, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ctx, setCtx] = useState<WorkshopContext | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');

  // Registration State
  const [showRegistration, setShowRegistration] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    opening_hours: '9:00 AM - 6:00 PM',
    categories: [] as string[],
    payment_methods: [] as string[],
    latitude: 25.6866,
    longitude: -100.3161,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const context = await getWorkshopContext();
      if (!context) {
        setCtx(null);
        return;
      }
      setCtx(context);

      const [{ data: appointmentData }, { data: serviceData }] = await Promise.all([
        supabase
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
          .eq('workshop_id', context.workshopId)
          .order('scheduled_at', { ascending: true })
          .limit(30),
        supabase
          .from('service_catalog')
          .select('id, name')
          .eq('active', true)
          .order('name', { ascending: true }),
      ]);

      setAppointments((appointmentData || []) as Appointment[]);
      setServices((serviceData || []) as Service[]);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function getWorkshopContext(): Promise<WorkshopContext | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('workshop_staff')
      .select('workshop_id, workshop:workshops(name)')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      workshopId: data.workshop_id,
      workshopName: (data as any).workshop?.name || 'Mi Taller',
    };
  }

  async function handleRegisterWorkshop() {
    if (!formData.name || !formData.address || !formData.phone) {
      Alert.alert('Faltan Datos', 'Por favor completa el nombre, dirección y teléfono.');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user session');

      // 1. Insert Workshop
      const { data: workshop, error: wError } = await supabase
        .from('workshops')
        .insert([{
          name: formData.name,
          description: formData.description,
          address: formData.address,
          phone: formData.phone,
          opening_hours: formData.opening_hours,
          categories: formData.categories,
          payment_methods: formData.payment_methods,
          latitude: formData.latitude,
          longitude: formData.longitude,
          status: 'active' // Auto-active if complete
        }])
        .select()
        .single();

      if (wError) throw wError;

      // 2. Insert Staff Link (Owner)
      const { error: sError } = await supabase
        .from('workshop_staff')
        .insert([{
          workshop_id: workshop.id,
          user_id: user.id,
          role_in_workshop: 'owner'
        }]);

      if (sError) throw sError;

      // 3. Update profile role to mechanic if it was client
      if (role === 'client') {
        await supabase
          .from('profiles')
          .update({ role: 'mechanic' })
          .eq('id', user.id);
      }

      Alert.alert('¡Éxito!', 'Tu taller ha sido registrado correctamente.');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Ocurrió un error al registrar el taller.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddWorkshopService() {
    if (!ctx) return;
    if (!selectedServiceId) {
      Alert.alert('Faltan datos', 'Selecciona un servicio.');
      return;
    }

    setSaving(true);
    try {
      const parsedPrice = estimatedPrice.trim() ? Number(estimatedPrice) : null;
      const { error } = await supabase
        .from('workshop_services')
        .upsert({
          workshop_id: ctx.workshopId,
          service_id: selectedServiceId,
          custom_price: parsedPrice,
          active: true,
        }, { onConflict: 'workshop_id,service_id' });

      if (error) throw error;
      setSelectedServiceId('');
      setEstimatedPrice('');
      Alert.alert('Listo', 'Servicio agregado al taller.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo agregar el servicio.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(appointmentId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      
      // Refresh local list
      setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status: newStatus } : a));
      Alert.alert('Actualizado', `La cita ahora está en estado: ${newStatus.toUpperCase()}`);
    } catch (e: any) {
      Alert.alert('Error', 'No se pudo actualizar el estado de la cita.');
    }
  }

  const toggleSelection = (item: string, field: 'categories' | 'payment_methods') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item) 
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  // --- RENDERING ---

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Mi Taller' }} />
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  // ONBOARDING VIEW
  if (!ctx && !showRegistration) {
    return (
      <View style={styles.containerNoPadding}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient
          colors={[THEME.secondary, THEME.primary]}
          style={styles.hero}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="construct-outline" size={60} color="white" />
            </View>
            <Text style={styles.heroTitle}>Lleva tu taller al siguiente nivel</Text>
            <Text style={styles.heroSubtitle}>
              Gestiona tus citas, publica tus servicios y llega a más clientes con Autofix.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.onboardingBody}>
          <Text style={styles.sectionTitle}>¿Por qué unirse?</Text>
          <View style={styles.featureRow}>
            <Ionicons name="calendar-outline" size={24} color={THEME.primary} />
            <Text style={styles.featureText}>Agenda digital de citas para tus clientes.</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="map-outline" size={24} color={THEME.primary} />
            <Text style={styles.featureText}>Aparece en el mapa de servicios cercanos.</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="stats-chart-outline" size={24} color={THEME.primary} />
            <Text style={styles.featureText}>Control de historial y gestión de inventario.</Text>
          </View>

          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => setShowRegistration(true)}
          >
            <Text style={styles.primaryButtonText}>Registrar mi Taller Ahora</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // REGISTRATION WIZARD
  if (!ctx && showRegistration) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Registro de Taller', headerShown: true }} />
        
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2, 3, 4].map((s) => (
            <View 
              key={s} 
              style={[
                styles.stepDot, 
                step >= s && { backgroundColor: THEME.primary },
                step === s && { width: 30 }
              ]} 
            />
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {step === 1 && (
            <View style={styles.animatedStep}>
              <Text style={styles.stepTitle}>Información Básica</Text>
              <Text style={styles.stepSubtitle}>Cuéntanos cómo se llama tu taller y qué lo hace especial.</Text>
              
              <Text style={styles.label}>Nombre del Taller</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Ej: El Rey del Motor"
                value={formData.name}
                onChangeText={(v) => setFormData({...formData, name: v})}
              />

              <Text style={styles.label}>Descripción</Text>
              <TextInput 
                style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
                placeholder="Breve descripción de tus servicios principales..."
                multiline
                numberOfLines={4}
                value={formData.description}
                onChangeText={(v) => setFormData({...formData, description: v})}
              />
            </View>
          )}

          {step === 2 && (
            <View style={styles.animatedStep}>
              <Text style={styles.stepTitle}>Ubicación Visual</Text>
              <Text style={styles.stepSubtitle}>Toca el mapa para marcar exactamente dónde está tu taller.</Text>
              
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.miniMap}
                  initialRegion={{
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  onPress={(e) => setFormData({
                    ...formData, 
                    latitude: e.nativeEvent.coordinate.latitude,
                    longitude: e.nativeEvent.coordinate.longitude
                  })}
                >
                  <Marker 
                    coordinate={{ latitude: formData.latitude, longitude: formData.longitude }}
                    draggable
                    onDragEnd={(e) => setFormData({
                      ...formData, 
                      latitude: e.nativeEvent.coordinate.latitude,
                      longitude: e.nativeEvent.coordinate.longitude
                    })}
                  />
                </MapView>
                <View style={styles.mapOverlay}>
                  <Text style={styles.mapHint}>Mantén presionado para mover el pin</Text>
                </View>
              </View>

              <Text style={styles.label}>Dirección Escrita</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Calle, Número, Colonia, Ciudad"
                value={formData.address}
                onChangeText={(v) => setFormData({...formData, address: v})}
              />
            </View>
          )}

          {step === 3 && (
            <View style={styles.animatedStep}>
              <Text style={styles.stepTitle}>Servicios y Pagos</Text>
              <Text style={styles.stepSubtitle}>¿Qué reparas y cómo te pueden pagar?</Text>

              <Text style={styles.labelSection}>Categorías Principales</Text>
              <View style={styles.chipGrid}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity 
                    key={cat}
                    style={[styles.choiceChip, formData.categories.includes(cat) && styles.choiceChipActive]}
                    onPress={() => toggleSelection(cat, 'categories')}
                  >
                    <Text style={[styles.choiceChipText, formData.categories.includes(cat) && styles.choiceChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.labelSection, { marginTop: 20 }]}>Métodos de Pago</Text>
              <View style={styles.chipGrid}>
                {PAYMENT_METHODS.map(pm => (
                  <TouchableOpacity 
                    key={pm}
                    style={[styles.choiceChip, formData.payment_methods.includes(pm) && styles.choiceChipActive]}
                    onPress={() => toggleSelection(pm, 'payment_methods')}
                  >
                    <Text style={[styles.choiceChipText, formData.payment_methods.includes(pm) && styles.choiceChipTextActive]}>{pm}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 4 && (
            <View style={styles.animatedStep}>
              <Text style={styles.stepTitle}>Últimos Detalles</Text>
              <Text style={styles.stepSubtitle}>Danos tus datos de contacto para finalizar.</Text>

              <Text style={styles.label}>Teléfono</Text>
              <TextInput 
                style={styles.input} 
                placeholder="81 1234 5678"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(v) => setFormData({...formData, phone: v})}
              />

              <Text style={styles.label}>Horarios</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Lunes a Viernes 9:00 AM - 6:00 PM"
                value={formData.opening_hours}
                onChangeText={(v) => setFormData({...formData, opening_hours: v})}
              />

              <View style={styles.summaryCard}>
                <Ionicons name="information-circle" size={20} color={THEME.primary} />
                <Text style={styles.summaryText}>
                  Al registrarte, tu taller aparecerá automáticamente en el mapa para todos los usuarios.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.wizardControls}>
            {step > 1 && (
              <TouchableOpacity 
                style={styles.secondaryButton}
                onPress={() => setStep(step - 1)}
              >
                <Text style={styles.secondaryButtonText}>Atrás</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.primaryButton, { flex: 1 }]}
              onPress={() => {
                if (step < 4) setStep(step + 1);
                else handleRegisterWorkshop();
              }}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {step === 4 ? 'Finalizar Registro' : 'Siguiente'}
                  </Text>
                  <Ionicons name={step === 4 ? "checkmark-circle" : "chevron-forward"} size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // MAIN ADMIN PANEL (When workshop is linked)
  if (!ctx) return null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Panel de Control', headerShown: true }} />

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.adminHeader}>
            <View style={styles.welcomeCard}>
              <LinearGradient
                colors={[THEME.secondary, '#1e3a8a']}
                style={styles.welcomeGradient}
              >
                <Text style={styles.welcomeTitle}>¡Hola, {ctx.workshopName}!</Text>
                <Text style={styles.welcomeSubtitle}>Hoy tienes {appointments.length} citas programadas.</Text>
              </LinearGradient>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Servicios del Taller</Text>
            </View>

            <View style={styles.actionCard}>
              <Text style={styles.cardLabel}>Agregar nuevo servicio</Text>
              <View style={styles.chipScrollContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollChips}>
                  {services.map((service) => (
                    <TouchableOpacity
                      key={service.id}
                      style={[styles.serviceChip, selectedServiceId === service.id && styles.serviceChipActive]}
                      onPress={() => setSelectedServiceId(service.id)}
                    >
                      <Text style={[styles.serviceChipText, selectedServiceId === service.id && styles.serviceChipTextActive]}>
                        {service.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.priceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.labelMini}>Precio estimado</Text>
                  <TextInput
                    style={styles.inputSmall}
                    value={estimatedPrice}
                    onChangeText={setEstimatedPrice}
                    placeholder="$ 0.00"
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.addButton, saving && { opacity: 0.7 }]}
                  onPress={handleAddWorkshopService}
                  disabled={saving}
                >
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Citas Recientes</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.appointmentCard}>
            <View style={styles.appointmentHeader}>
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
                 <Ionicons name="car-outline" size={14} color={THEME.textSoft} /> {(item as any).vehicle?.make} {(item as any).vehicle?.model} ({(item as any).vehicle?.license_plate})
               </Text>
               <Text style={styles.detailText}>
                 <Ionicons name="construct-outline" size={14} color={THEME.textSoft} /> {(item as any).service?.name || 'Servicio General'}
               </Text>
            </View>

            {item.notes && (
              <View style={styles.appointmentNotesBox}>
                <Text style={styles.appointmentNotes}>{item.notes}</Text>
              </View>
            )}

            <View style={styles.statusActions}>
               {item.status === 'pending' && (
                 <TouchableOpacity 
                   style={[styles.smallActionBtn, { backgroundColor: THEME.primary }]}
                   onPress={() => handleUpdateStatus(item.id, 'approved')}
                 >
                   <Text style={styles.smallActionBtnText}>Aceptar Cita</Text>
                 </TouchableOpacity>
               )}
               {item.status === 'approved' && (
                 <TouchableOpacity 
                   style={[styles.smallActionBtn, { backgroundColor: THEME.secondary }]}
                   onPress={() => handleUpdateStatus(item.id, 'in_workshop')}
                 >
                   <Text style={styles.smallActionBtnText}>Recibir en Taller</Text>
                 </TouchableOpacity>
               )}
               {item.status === 'in_workshop' && (
                 <TouchableOpacity 
                   style={[styles.smallActionBtn, { backgroundColor: '#10B981' }]}
                   onPress={() => handleUpdateStatus(item.id, 'completed')}
                 >
                   <Text style={styles.smallActionBtnText}>Finalizar</Text>
                 </TouchableOpacity>
               )}
               {item.status !== 'completed' && item.status !== 'cancelled' && (
                 <TouchableOpacity 
                   style={styles.cancelBtn}
                   onPress={() => handleUpdateStatus(item.id, 'cancelled')}
                 >
                   <Text style={styles.cancelBtnText}>Rechazar</Text>
                 </TouchableOpacity>
               )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={THEME.border} />
            <Text style={styles.emptyText}>No hay citas registradas.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 28 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  containerNoPadding: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // HERO STYLES
  hero: {
    height: height * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    padding: 30,
  },
  heroContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  heroIconContainer: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    textAlign: 'center',
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  onboardingBody: {
    padding: 30,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    color: THEME.textSoft,
    flex: 1,
  },
  // WIZARD STYLES
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 30,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.border,
  },
  animatedStep: {
    gap: 10,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
  },
  stepSubtitle: {
    fontSize: 15,
    color: THEME.textSoft,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginTop: 10,
  },
  labelSection: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginTop: 6,
  },
  primaryButton: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 16,
    gap: 10,
    marginTop: 20,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  secondaryButton: {
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: THEME.textSoft,
    fontSize: 16,
    fontWeight: '600',
  },
  wizardControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  // MAP PICKER
  mapContainer: {
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 15,
  },
  miniMap: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  mapHint: {
    fontSize: 12,
    color: THEME.textSoft,
  },
  // CHIPS
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  choiceChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: 'white',
  },
  choiceChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  choiceChipText: {
    fontSize: 14,
    color: THEME.text,
  },
  choiceChipTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#E0F2FE',
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    color: '#0369A1',
    lineHeight: 18,
  },
  // ADMIN PANEL STYLES
  adminHeader: {
    paddingBottom: 10,
  },
  welcomeCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  welcomeGradient: {
    padding: 24,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 12,
  },
  chipScrollContainer: {
    height: 45,
    marginBottom: 15,
  },
  scrollChips: {
    flexDirection: 'row',
  },
  serviceChip: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: '#F9FAFB',
    marginRight: 10,
    justifyContent: 'center',
  },
  serviceChipActive: {
    backgroundColor: THEME.primary,
    borderColor: THEME.primary,
  },
  serviceChipText: {
    fontSize: 13,
    color: THEME.textSoft,
  },
  serviceChipTextActive: {
    color: 'white',
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  labelMini: {
    fontSize: 12,
    color: THEME.textSoft,
    marginBottom: 4,
  },
  inputSmall: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: THEME.primary,
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // APPOINTMENT CARD
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  dateCircle: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.textSoft,
  },
  appointmentInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  appointmentNotesBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  appointmentNotes: {
    fontSize: 13,
    color: THEME.textSoft,
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: THEME.textSoft,
  },
  clientName: {
    fontSize: 13,
    color: THEME.textSoft,
    fontWeight: '500',
  },
  appointmentDetailsBox: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 12,
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: THEME.text,
  },
  statusActions: {
    flexDirection: 'row',
    marginTop: 15,
    gap: 10,
    justifyContent: 'flex-end',
  },
  smallActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  smallActionBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
