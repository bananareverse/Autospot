import { useCallback, useEffect, useState } from 'react';
import { 
  ActivityIndicator, 
  Alert, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  ScrollView,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/ctx/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

type WorkshopContext = {
  workshopId: string;
  workshopName: string;
};

type Service = {
  id: string;
  name: string;
};

const THEME = {
  bg: '#F9FAFB',
  text: '#111827',
  textSoft: '#6B7280',
  primary: '#fb8500',   // Orange
  secondary: '#023047', // Navy
  accent: '#ffb703',    // Light Orange
  card: '#FFFFFF',
  border: '#E5E7EB',
  danger: '#EF4444',
  success: '#10B981',
};

const CATEGORIES = [
  'Mecánica General', 'Eléctrico', 'Frenos', 'Suspensión',
  'Afinación', 'Hojalatería', 'Pintura', 'Llantas',
  'Detallado', 'Aire Acondicionado'
];

const PAYMENT_METHODS = [
  'Efectivo', 'Tarjeta de Crédito/Débito', 'Transferencia', 'Mercado Pago'
];

export default function WorkshopAdminScreen() {
  const { role } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ctx, setCtx] = useState<WorkshopContext | null>(null);
  
  const [services, setServices] = useState<Service[]>([]); // ALL available platform services
  const [myServices, setMyServices] = useState<any[]>([]); // ACTIVE services for this workshop
  const [appointmentCount, setAppointmentCount] = useState(0);

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

      const [{ count: apptCount }, { data: serviceData }, { data: myServiceData }] = await Promise.all([
        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('workshop_id', context.workshopId)
          .gte('scheduled_at', new Date().toISOString().split('T')[0]),
        supabase
          .from('service_catalog')
          .select('id, name')
          .eq('active', true)
          .order('name', { ascending: true }),
        supabase
          .from('workshop_services')
          .select('id, service_id, custom_price, service:service_catalog(name)')
          .eq('workshop_id', context.workshopId)
          .eq('active', true),
      ]);

      setAppointmentCount(apptCount || 0);
      setServices((serviceData || []) as Service[]);
      setMyServices(myServiceData || []);
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
          status: 'active'
        }])
        .select()
        .single();

      if (wError) throw wError;

      const { error: sError } = await supabase
        .from('workshop_staff')
        .insert([{
          workshop_id: workshop.id,
          user_id: user.id,
          role_in_workshop: 'owner'
        }]);

      if (sError) throw sError;

      if (role === 'client') {
        await supabase.from('profiles').update({ role: 'mechanic' }).eq('id', user.id);
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
      Alert.alert('Faltan datos', 'Selecciona un servicio de la lista.');
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
      Alert.alert('Listo', 'Servicio agregado al catálogo.');
      loadData(); 
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo agregar el servicio.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteWorkshopService(workshopServiceId: string) {
    Alert.alert(
      "Eliminar Servicio",
      "¿Quitar este servicio de tu catálogo activo? Ya no te podrán agendar para esto.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              const { error } = await supabase
                .from('workshop_services')
                .update({ active: false }) 
                .eq('id', workshopServiceId);

              if (error) throw error;
              
              setMyServices(prev => prev.filter(s => s.id !== workshopServiceId));
            } catch (error: any) {
              Alert.alert("Error", error.message || "No se pudo eliminar.");
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  }

  const toggleSelection = (item: string, field: 'categories' | 'payment_methods') => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item) 
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Mis Servicios' }} />
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  // --- ONBOARDING VIEW ---
  if (!ctx && !showRegistration) {
    return (
      <View style={styles.containerNoPadding}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient colors={[THEME.secondary, THEME.primary]} style={styles.hero}>
          <View style={styles.heroContent}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="construct-outline" size={60} color="white" />
            </View>
            <Text style={styles.heroTitle}>Lleva tu taller al siguiente nivel</Text>
            <Text style={styles.heroSubtitle}>Gestiona tus citas, publica tus servicios y llega a más clientes con Autofix.</Text>
          </View>
        </LinearGradient>
        <View style={styles.onboardingBody}>
          <Text style={styles.onboardingSectionTitle}>¿Por qué unirse?</Text>
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
          <TouchableOpacity style={styles.primaryButton} onPress={() => setShowRegistration(true)}>
            <Text style={styles.primaryButtonText}>Registrar mi Taller Ahora</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- REGISTRATION WIZARD ---
  // (Registration step logs cut for extreme layout brevity, exact same flow as before intact)
  if (!ctx && showRegistration) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Registro de Taller', headerShown: true }} />
        <View style={styles.stepIndicator}>
          {[1, 2, 3, 4].map((s) => (
            <View key={s} style={[styles.stepDot, step >= s && { backgroundColor: THEME.primary }, step === s && { width: 30 }]} />
          ))}
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
           {/* Normal registration steps */}
           {step === 1 && (
            <View style={styles.animatedStep}>
              <Text style={styles.stepTitle}>Información Básica</Text>
              <Text style={styles.stepSubtitle}>Cuéntanos cómo se llama tu taller y qué lo hace especial.</Text>
              <Text style={styles.label}>Nombre del Taller</Text>
              <TextInput style={styles.input} placeholder="Ej: El Rey del Motor" value={formData.name} onChangeText={(v) => setFormData({...formData, name: v})} />
              <Text style={styles.label}>Descripción</Text>
              <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} placeholder="Breve descripción..." multiline numberOfLines={4} value={formData.description} onChangeText={(v) => setFormData({...formData, description: v})} />
            </View>
          )}

          {step === 2 && (
            <View style={styles.animatedStep}>
              <Text style={styles.stepTitle}>Ubicación Visual</Text>
              <Text style={styles.stepSubtitle}>Toca el mapa para marcar exactamente dónde está tu taller.</Text>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.miniMap}
                  initialRegion={{ latitude: formData.latitude, longitude: formData.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
                  onPress={(e) => setFormData({ ...formData, latitude: e.nativeEvent.coordinate.latitude, longitude: e.nativeEvent.coordinate.longitude })}
                >
                  <Marker coordinate={{ latitude: formData.latitude, longitude: formData.longitude }} draggable onDragEnd={(e) => setFormData({ ...formData, latitude: e.nativeEvent.coordinate.latitude, longitude: e.nativeEvent.coordinate.longitude })} />
                </MapView>
                <View style={styles.mapOverlay}>
                  <Text style={styles.mapHint}>Mantén presionado para mover el pin</Text>
                </View>
              </View>
              <Text style={styles.label}>Dirección Escrita</Text>
              <TextInput style={styles.input} placeholder="Calle, Número, Colonia, Ciudad" value={formData.address} onChangeText={(v) => setFormData({...formData, address: v})} />
            </View>
          )}

          {step === 3 && (
            <View style={styles.animatedStep}>
              <Text style={styles.stepTitle}>Servicios y Pagos</Text>
              <Text style={styles.stepSubtitle}>¿Qué reparas y cómo te pueden pagar?</Text>
              <Text style={styles.labelSection}>Categorías Principales</Text>
              <View style={styles.chipGrid}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat} style={[styles.choiceChip, formData.categories.includes(cat) && styles.choiceChipActive]} onPress={() => toggleSelection(cat, 'categories')}>
                    <Text style={[styles.choiceChipText, formData.categories.includes(cat) && styles.choiceChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.labelSection, { marginTop: 20 }]}>Métodos de Pago</Text>
              <View style={styles.chipGrid}>
                {PAYMENT_METHODS.map(pm => (
                  <TouchableOpacity key={pm} style={[styles.choiceChip, formData.payment_methods.includes(pm) && styles.choiceChipActive]} onPress={() => toggleSelection(pm, 'payment_methods')}>
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
              <TextInput style={styles.input} placeholder="81 1234 5678" keyboardType="phone-pad" value={formData.phone} onChangeText={(v) => setFormData({...formData, phone: v})} />
              <Text style={styles.label}>Horarios</Text>
              <TextInput style={styles.input} placeholder="Lunes a Viernes 9:00 AM - 6:00 PM" value={formData.opening_hours} onChangeText={(v) => setFormData({...formData, opening_hours: v})} />
            </View>
          )}

          <View style={styles.wizardControls}>
            {step > 1 && (
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(step - 1)}>
                <Text style={styles.secondaryButtonText}>Atrás</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={() => { if (step < 4) setStep(step + 1); else handleRegisterWorkshop(); }} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : (
                <>
                  <Text style={styles.primaryButtonText}>{step === 4 ? 'Finalizar Registro' : 'Siguiente'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // --- SEPARATED SERVICES DASHBOARD VIEW ---
  if (!ctx) return null;
  
  const availableServices = services.filter(s => !myServices.some(ms => ms.service_id === s.id));

  return (
    <View style={styles.containerAdmin}>
      <Stack.Screen options={{ 
        title: 'Servicios', 
        headerTintColor: 'white',
        headerTransparent: false,
        headerStyle: { backgroundColor: THEME.secondary },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '900', fontSize: 20 },
      }} />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
          {/* Top Blue Banner Wrapper */}
          <View style={[styles.topBlueWrapper, { paddingTop: insets.top + 20 }]}>
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeContent}>
                <View style={styles.welcomeRow}>
                    <View style={styles.welcomeTextBox}>
                        <Text style={styles.welcomeTitle}>¡Hola, equipo de</Text>
                        <Text style={styles.welcomeWorkshop}>{ctx.workshopName}!</Text>
                        <View style={styles.appointmentStatsBadge}>
                            <Ionicons name="calendar" size={14} color={THEME.primary} />
                            <Text style={styles.appointmentStatsText}>{appointmentCount} citas próximas</Text>
                        </View>
                    </View>
                    <View style={styles.welcomeIconCircle}>
                        <Ionicons name="construct" size={28} color={THEME.primary} />
                    </View>
                </View>
              </View>
            </View>
          </View>

          {/* White Bottom Body that overlaps nicely */}
          <View style={styles.whiteBodyWrapper}>
             
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tus Servicios Ofrecidos</Text>
            </View>

            {myServices.length > 0 ? (
              <View style={styles.myServicesContainer}>
                {myServices.map(item => (
                  <View key={item.id} style={styles.myServiceItem}>
                    <View style={styles.myServiceInfo}>
                      <Text style={styles.myServiceTitle}>{item.service?.name || "Servicio"}</Text>
                      <Text style={styles.myServicePrice}>
                        {item.custom_price ? `Cotizado desde $${item.custom_price.toFixed(2)}` : 'Precio variable (Por revisar)'}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteServiceBtn}
                      onPress={() => handleDeleteWorkshopService(item.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color={THEME.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyServicesBox}>
                 <Ionicons name="folder-open-outline" size={32} color={THEME.textSoft} style={{marginBottom: 8}} />
                 <Text style={styles.emptyServicesTitle}>Tu catálogo está vacío</Text>
                 <Text style={styles.emptyServicesText}>Añade tus especialidades abajo.</Text>
              </View>
            )}

            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Agregar Especialidad</Text>
            </View>

            <View style={styles.actionCard}>
              <Text style={styles.cardLabel}>Catálogo de Autofix</Text>
              
              <View style={styles.verticalChipsContainer}>
                {availableServices.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={[styles.serviceChipVertical, selectedServiceId === service.id && styles.serviceChipVerticalActive]}
                    onPress={() => setSelectedServiceId(service.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.serviceChipVerticalRow}>
                      <Ionicons 
                        name={selectedServiceId === service.id ? "checkmark-circle" : "ellipse-outline"} 
                        size={22} 
                        color={selectedServiceId === service.id ? 'white' : THEME.textSoft} 
                      />
                      <Text style={[styles.serviceChipTextVertical, selectedServiceId === service.id && styles.serviceChipTextVerticalActive]}>
                        {service.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {availableServices.length === 0 && (
                   <Text style={{color: THEME.textSoft, fontStyle: 'italic', marginBottom: 10, textAlign: 'center'}}>
                     ¡Ya agregaste todas las especialidades disponibles!
                   </Text>
                )}
              </View>

              {selectedServiceId !== '' && (
                <View style={[styles.priceRow, {marginTop: 20}]}>
                  <View style={styles.priceInputWrapper}>
                    <Text style={styles.labelMini}>Precio base / desde (Opcional)</Text>
                    <View style={styles.inputBoxMini}>
                      <Ionicons name="cash-outline" size={18} color={THEME.textSoft} />
                      <TextInput
                          style={styles.inputSmall}
                          value={estimatedPrice}
                          onChangeText={setEstimatedPrice}
                          placeholder="$ 0.00"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.addButton, saving && { opacity: 0.7 }]}
                    onPress={handleAddWorkshopService}
                    disabled={saving}
                  >
                    {saving ? <ActivityIndicator color="white" /> : <Ionicons name="add" size={24} color="white" />}
                  </TouchableOpacity>
                </View>
              )}
            </View>

          </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 20 },
  containerNoPadding: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hero: { height: height * 0.45, justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, padding: 30 },
  heroContent: { alignItems: 'center', marginTop: 20 },
  heroIconContainer: { width: 100, height: 100, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: 'white', textAlign: 'center', lineHeight: 36 },
  heroSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  onboardingBody: { padding: 30, flex: 1 },
  onboardingSectionTitle: { fontSize: 20, fontWeight: '700', color: THEME.text, marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  featureText: { fontSize: 15, color: THEME.textSoft, flex: 1 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 30 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.border },
  animatedStep: { gap: 10 },
  stepTitle: { fontSize: 24, fontWeight: '800', color: THEME.text },
  stepSubtitle: { fontSize: 15, color: THEME.textSoft, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: THEME.text, marginTop: 10 },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: THEME.border, borderRadius: 12, padding: 15, fontSize: 16, marginTop: 6 },
  primaryButton: { backgroundColor: THEME.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, gap: 10, marginTop: 20 },
  primaryButtonText: { color: 'white', fontSize: 17, fontWeight: '700' },
  secondaryButton: { padding: 18, justifyContent: 'center', alignItems: 'center' },
  secondaryButtonText: { color: THEME.textSoft, fontSize: 16, fontWeight: '600' },
  wizardControls: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  mapContainer: { height: 250, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: THEME.border, marginBottom: 15 },
  miniMap: { flex: 1 },
  mapOverlay: { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 8, borderRadius: 10, alignItems: 'center' },
  mapHint: { fontSize: 12, color: THEME.textSoft },
  labelSection: { fontSize: 16, fontWeight: '700', color: THEME.text },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  choiceChip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: THEME.border, backgroundColor: 'white' },
  choiceChipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  choiceChipText: { fontSize: 14, color: THEME.text },
  choiceChipTextActive: { color: 'white', fontWeight: '700' },

  // --- PREMIUM ADMIN PANEL LAYOUT ---
  containerAdmin: { flex: 1, backgroundColor: THEME.bg },
  topBlueWrapper: {
    backgroundColor: THEME.secondary,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 60, // Padding bottom gives room for the overlay
  },
  whiteBodyWrapper: {
    backgroundColor: THEME.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -40, // Pull it up over the blue background
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
    minHeight: height * 0.7,
  },
  welcomeCard: {
    backgroundColor: THEME.card,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  welcomeContent: { padding: 24 },
  welcomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeTextBox: { flex: 1 },
  welcomeTitle: { fontSize: 16, fontWeight: '600', color: THEME.textSoft },
  welcomeWorkshop: { fontSize: 22, fontWeight: '900', color: THEME.secondary, marginBottom: 8 },
  appointmentStatsBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 133, 0, 0.1)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', gap: 6
  },
  appointmentStatsText: { color: THEME.primary, fontWeight: 'bold', fontSize: 13 },
  welcomeIconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(251, 133, 0, 0.1)', justifyContent: 'center', alignItems: 'center' },
  sectionHeader: { marginBottom: 16, marginTop: 10, paddingLeft: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: THEME.secondary, textTransform: 'uppercase', letterSpacing: 1 },
  actionCard: {
    backgroundColor: THEME.card, borderRadius: 24, padding: 24, marginBottom: 30, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10,
    borderWidth: 1, borderColor: THEME.border
  },
  cardLabel: { fontSize: 16, fontWeight: 'bold', color: THEME.text, marginBottom: 16 },
  
  // NEW SERVICES STYLES
  myServicesContainer: { gap: 12, marginBottom: 10 },
  myServiceItem: {
    backgroundColor: THEME.card, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1, borderColor: THEME.border, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6
  },
  myServiceInfo: { flex: 1 },
  myServiceTitle: { fontSize: 16, fontWeight: '800', color: THEME.secondary, marginBottom: 4 },
  myServicePrice: { fontSize: 13, color: THEME.primary, fontWeight: '700' },
  deleteServiceBtn: { padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderRadius: 12, marginLeft: 10 },
  emptyServicesBox: {
    padding: 30, backgroundColor: THEME.card, borderRadius: 16, borderWidth: 1, borderColor: THEME.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 10
  },
  emptyServicesTitle: { fontSize: 16, fontWeight: '700', color: THEME.text, marginBottom: 4 },
  emptyServicesText: { color: THEME.textSoft, fontSize: 14, textAlign: 'center' },
  verticalChipsContainer: { gap: 10, marginBottom: 10 },
  serviceChipVertical: { padding: 16, borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: THEME.border },
  serviceChipVerticalActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  serviceChipVerticalRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceChipTextVertical: { fontSize: 15, fontWeight: '700', color: THEME.text },
  serviceChipTextVerticalActive: { color: 'white', fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16 },
  priceInputWrapper: { flex: 1 },
  labelMini: { fontSize: 13, fontWeight: '600', color: THEME.textSoft, marginBottom: 8, marginLeft: 4 },
  inputBoxMini: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, paddingHorizontal: 14,
    height: 50, borderWidth: 1, borderColor: THEME.border
  },
  inputSmall: { flex: 1, fontSize: 15, color: THEME.text, fontWeight: '700', marginLeft: 8 },
  addButton: {
    backgroundColor: THEME.primary, width: 50, height: 50, borderRadius: 16, justifyContent: 'center',
    alignItems: 'center', shadowColor: THEME.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
});
