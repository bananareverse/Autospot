import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { 
    ActivityIndicator, 
    Alert, 
    ScrollView, 
    StyleSheet, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    View, 
    Linking,
    Dimensions,
    Platform,
    RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const THEME = {
    primary: '#219ebc',
    secondary: '#023047',
    accent: '#fb8500',
    white: '#FFFFFF',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    text: '#1E293B',
    textMuted: '#64748B',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    neutral: '#64748B',
};

const STATUS_CONFIG: Record<string, { label: string, color: string, icon: any, step: number }> = {
    scheduled: { label: 'En Espera', color: '#1E293B', icon: 'time-outline', step: 0 },
    on_hold: { label: 'En Revisión', color: '#FB923C', icon: 'alert-circle-outline', step: 1 },
    in_progress: { label: 'En Proceso', color: '#3B82F6', icon: 'hammer-outline', step: 2 },
    ready: { label: 'Lista', color: '#10B981', icon: 'star-outline', step: 3 },
    completed: { label: 'Completada', color: '#64748B', icon: 'checkmark-done-circle-outline', step: 4 },
    cancelled: { label: 'Cancelada', color: '#EF4444', icon: 'close-circle-outline', step: -1 },
};

export default function WorkshopAppointmentDetails() {
    const params = useLocalSearchParams();
    const appointmentId = Array.isArray(params.appointmentId) ? params.appointmentId[0] : params.appointmentId;
    const router = useRouter();

    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notesText, setNotesText] = useState('');

    useEffect(() => {
        loadAppointment();
    }, [appointmentId]);

    const loadAppointment = async () => {
        if (!appointmentId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    client:clients(first_name, last_name, email, phone),
                    vehicle:vehicles(make, model, license_plate, year, color),
                    service:service_catalog(name, description, estimated_price)
                `)
                .eq('id', appointmentId)
                .single();

            if (data) {
                let finalPrice = data.service?.estimated_price;
                const { data: ws } = await supabase
                    .from('workshop_services')
                    .select('custom_price')
                    .eq('workshop_id', data.workshop_id)
                    .eq('service_id', data.service_id)
                    .maybeSingle();
                if (ws?.custom_price) finalPrice = ws.custom_price;
                
                data.final_price = finalPrice;
                setAppointment(data);
                setNotesText(data.notes || '');
            }
        } catch (e) {
            console.error("Load appointment error:", e);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (newStatus: string) => {
        if (!appointment) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: newStatus, notes: notesText })
                .eq('id', appointment.id);
            if (error) throw error;
            setAppointment({ ...appointment, status: newStatus, notes: notesText });
            Alert.alert("¡Éxito!", `Estado actualizado a: ${STATUS_CONFIG[newStatus].label}`);
        } catch (e: any) {
            Alert.alert("Error", e.message || "No se pudo actualizar la cita");
        } finally {
            setSaving(false);
        }
    };

    const callClient = () => {
        if (appointment?.client?.phone) {
            Linking.openURL(`tel:${appointment.client.phone}`);
        }
    };

    const currentStatus = STATUS_CONFIG[appointment?.status] || STATUS_CONFIG.scheduled;

    if (loading && !appointment) return (
        <View style={styles.center}><ActivityIndicator size="large" color={THEME.primary} /></View>
    );

    if (!appointment) return (
        <View style={styles.center}><Text>Cita no encontrada</Text></View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView 
                contentContainerStyle={styles.scrollContent} 
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={loadAppointment} tintColor={THEME.primary} colors={[THEME.primary]} />
                }
            >

                <LinearGradient colors={[THEME.secondary, THEME.primary]} style={styles.header}>
                    <View style={styles.headerTop}>
                        <TouchableOpacity style={styles.backButtonCompact} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.chatButton} 
                            onPress={() => router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: appointment.id } })}
                        >
                            <Ionicons name="chatbubbles" size={20} color="white" />
                            <Text style={styles.chatButtonText}>Chat</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.headerContent}>
                        <View style={[styles.statusTag, { backgroundColor: currentStatus.color }]}>
                            <Ionicons name={currentStatus.icon} size={14} color="white" />
                            <Text style={styles.statusTagText}>{currentStatus.label.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.headerTitle}>Gestión de Cita</Text>
                        <Text style={styles.headerSubtitle}>
                            {new Date(appointment.scheduled_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                            {" • "}
                            {new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </View>
                </LinearGradient>

                <View style={styles.body}>
                    <View style={styles.controlsSection}>
                        <Text style={styles.sectionTitle}>ACTUALIZAR ESTADO</Text>
                        <View style={styles.controlsGrid}>
                            <QuickButton label="En Espera" icon="time" color={THEME.secondary} active={appointment.status === 'scheduled'} onPress={() => updateStatus('scheduled')} />
                            <QuickButton label="En Revisión" icon="alert-circle" color={THEME.secondary} active={appointment.status === 'on_hold'} onPress={() => updateStatus('on_hold')} />
                            <QuickButton label="En Proceso" icon="hammer" color={THEME.secondary} active={appointment.status === 'in_progress'} onPress={() => updateStatus('in_progress')} />
                            <QuickButton label="Lista" icon="star" color={THEME.secondary} active={appointment.status === 'ready'} onPress={() => updateStatus('ready')} />
                            <QuickButton label="Completada" icon="checkmark-done" color={THEME.secondary} active={appointment.status === 'completed'} onPress={() => updateStatus('completed')} />
                        </View>
                    </View>

                    <View style={styles.sectionCard}>
                        <View style={styles.progressTracker}>
                             {['scheduled', 'on_hold', 'in_progress', 'ready', 'completed'].map((stepKey, idx) => {
                                const stepConf = STATUS_CONFIG[stepKey];
                                let isActive = false;
                                // Se basa en la configuración del step o una lógica de secuencia
                                const currentStepIdx = currentStatus.step;
                                isActive = currentStepIdx >= idx || appointment.status === 'completed';
                                
                                return (
                                    <View key={stepKey} style={styles.trackerItem}>
                                        <View style={[styles.trackerDot, isActive && { backgroundColor: THEME.primary }]}>
                                            {isActive ? <Ionicons name="checkmark" size={10} color="white" /> : <View style={styles.innerDot} />}
                                        </View>
                                        <Text style={[styles.trackerLabel, isActive && { color: THEME.primary, fontWeight: '900' }]}>{stepConf.label}</Text>
                                        {idx < 4 && <View style={[styles.trackerLine, isActive && { backgroundColor: THEME.primary }]} />}
                                    </View>
                                );
                             })}
                        </View>
                    </View>

                    <View style={styles.infoGrid}>
                        <View style={styles.infoCard}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="person" size={16} color={THEME.primary} />
                                <Text style={styles.cardTitle}>CLIENTE</Text>
                            </View>
                            <Text style={styles.clientName} numberOfLines={1}>{appointment.client?.first_name} {appointment.client?.last_name}</Text>
                            <TouchableOpacity style={styles.callButton} onPress={callClient}>
                                <Ionicons name="phone-portrait" size={14} color="white" />
                                <Text style={styles.callButtonText}>{appointment.client?.phone || 'Llamar'}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.infoCard}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="car" size={16} color={THEME.primary} />
                                <Text style={styles.cardTitle}>VEHÍCULO</Text>
                            </View>
                            <Text style={styles.vehicleName} numberOfLines={1}>{appointment.vehicle?.make} {appointment.vehicle?.model}</Text>
                            <View style={styles.plateTag}>
                                <Text style={styles.plateText}>{appointment.vehicle?.license_plate}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.sectionCard}>
                        <View style={styles.cardHeader}>
                            <Ionicons name="construct" size={16} color={THEME.primary} />
                            <Text style={styles.cardTitle}>DETALLES DEL TRABAJO</Text>
                        </View>
                        <Text style={styles.serviceName}>{appointment.service?.name}</Text>
                        <View style={styles.priceRow}>
                             <Text style={styles.priceLabel}>Presupuesto:</Text>
                             <Text style={styles.priceValue}>${appointment.final_price?.toLocaleString()}</Text>
                        </View>

                        <View style={styles.divider} />

                        <Text style={[styles.cardTitle, { marginTop: 10, marginBottom: 8 }]}>NOTAS / DIAGNÓSTICO</Text>
                        <TextInput
                            style={styles.notesInput}
                            placeholder="Desarrolla el detalle del trabajo aquí..."
                            multiline
                            value={notesText}
                            onChangeText={setNotesText}
                        />
                        <TouchableOpacity style={styles.saveNotesBtn} onPress={() => updateStatus(appointment.status)}>
                            <Ionicons name="save-outline" size={16} color="white" />
                            <Text style={styles.saveNotesBtnText}>Guardar Notas</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                        style={styles.cancelLink} 
                        onPress={() => {
                            Alert.alert(
                                "¿Cancelar Cita?",
                                "¿Estás seguro que deseas cancelar esta cita?",
                                [
                                    { text: "No", style: "cancel" },
                                    { text: "Sí, cancelar", style: "destructive", onPress: () => updateStatus('cancelled') }
                                ]
                            );
                        }}
                    >
                        <Text style={styles.cancelLinkText}>Cancelar Cita Permanente</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

function QuickButton({ label, icon, color, active, onPress }: { label: string, icon: any, color: string, active: boolean, onPress: () => void }) {
    return (
        <TouchableOpacity 
            style={[styles.quickBtn, { backgroundColor: active ? THEME.primary : THEME.secondary, opacity: 1 }]} 
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Ionicons name={icon} size={18} color="white" />
            <Text style={styles.quickBtnText}>{label}</Text>
            {active && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: 40 },
    
    header: { paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, elevation: 8 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: Platform.OS === 'ios' ? 60 : 50 },
    backButtonCompact: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    chatButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: THEME.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, elevation: 4 },
    chatButtonText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
    headerContent: { paddingHorizontal: 24, marginTop: 10 },
    statusTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 12, gap: 6 },
    statusTagText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    headerTitle: { color: 'white', fontSize: 28, fontWeight: '900' },
    headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4, textTransform: 'capitalize' },

    body: { paddingHorizontal: 20, marginTop: -30 },
    sectionCard: { backgroundColor: THEME.white, borderRadius: 24, padding: 20, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    
    controlsSection: { marginBottom: 20 },
    sectionTitle: { fontSize: 11, fontWeight: '900', color: THEME.textMuted, letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
    controlsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    quickBtn: { width: (width - 60) / 2, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', gap: 6, position: 'relative' },
    quickBtnText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
    activeIndicator: { position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: 'white' },

    progressTracker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5 },
    trackerItem: { alignItems: 'center', flex: 1, position: 'relative' },
    trackerDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    innerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'white' },
    trackerLine: { position: 'absolute', top: 10, left: '60%', width: '80%', height: 2, backgroundColor: '#E2E8F0', zIndex: 0 },
    trackerLabel: { fontSize: 7.5, color: THEME.textMuted, marginTop: 6, textAlign: 'center' },

    infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    infoCard: { flex: 1, backgroundColor: THEME.white, borderRadius: 24, padding: 16, elevation: 3 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardTitle: { fontSize: 10, fontWeight: '900', color: THEME.textMuted, letterSpacing: 1 },
    clientName: { fontSize: 15, fontWeight: 'bold', color: THEME.text },
    callButton: { backgroundColor: THEME.secondary, borderRadius: 12, paddingVertical: 8, height: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
    callButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

    vehicleName: { fontSize: 15, fontWeight: 'bold', color: THEME.text },
    plateTag: { backgroundColor: THEME.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 10 },
    plateText: { color: THEME.primary, fontWeight: '900', fontSize: 12 },

    serviceName: { fontSize: 17, fontWeight: 'bold', color: THEME.text, marginBottom: 8 },
    priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    priceLabel: { fontSize: 14, color: THEME.textMuted },
    priceValue: { fontSize: 20, fontWeight: '900', color: THEME.secondary },
    divider: { height: 1, backgroundColor: THEME.bg, marginVertical: 10 },

    notesInput: { backgroundColor: THEME.bg, borderRadius: 16, padding: 15, minHeight: 80, textAlignVertical: 'top', fontSize: 14, color: THEME.text, marginBottom: 15 },
    saveNotesBtn: { height: 45, borderRadius: 14, backgroundColor: THEME.secondary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    saveNotesBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

    cancelLink: { alignSelf: 'center', marginTop: 10, padding: 10 },
    cancelLinkText: { color: THEME.danger, fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline' }
});