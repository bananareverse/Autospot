import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserVehicles } from '@/lib/vehicles';
import { scheduleAppointment } from '@/lib/appointments';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

const { width } = Dimensions.get('window');

const THEME = {
    primary: '#219ebc',    // Cian Premium
    secondary: '#023047',  // Marino Profundo
    accent: '#fb8500',     // Naranja (Acento)
    bg: '#FFFFFF',
    card: '#F9FAFB',
    text: '#1F2937',
    textMuted: '#6B7280',
    border: '#E5E7EB',
};

export default function ScheduleAppointmentScreen() {
    const router = useRouter();
    const { workshopId } = useLocalSearchParams<{ workshopId?: string }>();
    const initialWorkshopId = useMemo(() => {
        if (!workshopId) return '';
        if (Array.isArray(workshopId)) return workshopId[0];
        return workshopId;
    }, [workshopId]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data State
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [workshops, setWorkshops] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    
    // Selection State
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>(initialWorkshopId);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(Platform.OS === 'ios');
    const [notes, setNotes] = useState('');

    const [loadingServices, setLoadingServices] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                // 1. Load Workshops
                const { data: wData } = await supabase.from('workshops').select('id, name, address');
                setWorkshops(wData || []);
                if (wData && wData.length > 0 && !selectedWorkshopId) {
                    setSelectedWorkshopId(wData[0].id);
                }

                // 2. Load User Vehicles
                const vData = await getUserVehicles('');
                setVehicles(vData || []);
                if (vData && vData.length > 0) {
                    setSelectedVehicleId(vData[0].id);
                }
            } catch (e: any) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    useEffect(() => {
        async function loadServices() {
            if (!selectedWorkshopId) return;
            setLoadingServices(true);
            try {
                const { data } = await supabase.from('workshop_services')
                    .select('custom_price, service:service_catalog(*)')
                    .eq('workshop_id', selectedWorkshopId)
                    .eq('active', true);

                if (data) {
                    const normalized = data
                        .filter(item => item && item.service)
                        .map(item => {
                            const s = Array.isArray(item.service) ? item.service[0] : item.service;
                            return {
                                id: s?.id,
                                name: s?.name,
                                price: item.custom_price || s?.estimated_price,
                            };
                        });
                    setServices(normalized);
                    if (normalized.length > 0) setSelectedServiceId(normalized[0].id);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingServices(false);
            }
        }
        loadServices();
    }, [selectedWorkshopId]);

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    async function handleSchedule() {
        if (!selectedVehicleId || !selectedWorkshopId) {
            Alert.alert('Faltan Datos', 'Por favor selecciona un vehículo y un taller.');
            return;
        }

        setSaving(true);
        try {
            await scheduleAppointment({
                vehicle_id: selectedVehicleId,
                workshop_id: selectedWorkshopId,
                service_id: selectedServiceId || null,
                scheduled_at: date,
                notes: notes
            });

            Alert.alert('¡Cita Agendada!', 'Tu reserva se ha realizado con éxito.', [
                { text: 'Ir a mis citas', onPress: () => router.push('/appointments') }
            ]);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.primary} />
                <Text style={styles.loadingText}>Preparando agenda...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen options={{ 
                title: 'AGENDAR CITA', 
                headerTintColor: 'white',
                headerTransparent: true,
                headerTitleStyle: { fontWeight: 'bold' },
                headerTitleAlign: 'center'
            }} />

            <LinearGradient
                colors={[THEME.secondary, THEME.primary]}
                style={styles.headerGradient}
            />

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* SECCIÓN 1: VEHÍCULO */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="car-sport" size={24} color={THEME.primary} />
                            <Text style={styles.sectionTitle}>TU VEHÍCULO</Text>
                        </View>
                        
                        {vehicles.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                                {vehicles.map(v => (
                                    <TouchableOpacity 
                                        key={v.id}
                                        style={[styles.vehicleCard, selectedVehicleId === v.id && styles.activeCard]}
                                        onPress={() => setSelectedVehicleId(v.id)}
                                    >
                                        <Ionicons name="car" size={32} color={selectedVehicleId === v.id ? 'white' : THEME.primary} />
                                        <Text style={[styles.cardTitle, selectedVehicleId === v.id && styles.whiteText]}>{v.model}</Text>
                                        <Text style={[styles.cardSubtitle, selectedVehicleId === v.id && styles.whiteTextMuted]}>{v.license_plate}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity 
                                    style={styles.addCard}
                                    onPress={() => router.push('/my-vehicles')}
                                >
                                    <Ionicons name="add-circle" size={32} color={THEME.textMuted} />
                                    <Text style={styles.addCardText}>Añadir</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        ) : (
                            <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/my-vehicles')}>
                                <Text style={styles.emptyButtonText}>Registrar un vehículo primero</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* SECCIÓN 2: TALLER */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="business" size={24} color={THEME.primary} />
                            <Text style={styles.sectionTitle}>SELECCIONA EL TALLER</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                            {workshops.map(w => (
                                <TouchableOpacity 
                                    key={w.id}
                                    style={[styles.workshopCard, selectedWorkshopId === w.id && styles.activeCard]}
                                    onPress={() => setSelectedWorkshopId(w.id)}
                                >
                                    <View style={styles.workshopCardHeader}>
                                        <Text style={[styles.workshopCardName, selectedWorkshopId === w.id && styles.whiteText]}>
                                            {w.name}
                                        </Text>
                                        {selectedWorkshopId === w.id && (
                                            <Ionicons name="checkmark-circle" size={18} color="white" />
                                        )}
                                    </View>
                                    <Text style={[styles.workshopCardAddress, selectedWorkshopId === w.id && styles.whiteTextMuted]} numberOfLines={2}>
                                        {w.address || 'Sin dirección'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    {/* SECCIÓN 3: SERVICIOS */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="construct" size={24} color={THEME.primary} />
                            <Text style={styles.sectionTitle}>SERVICIO</Text>
                        </View>
                        {loadingServices ? (
                            <ActivityIndicator color={THEME.primary} />
                        ) : (
                            <View style={styles.chipGrid}>
                                {services.map(s => (
                                    <TouchableOpacity 
                                        key={s.id}
                                        style={[styles.serviceChip, selectedServiceId === s.id && styles.activeChip]}
                                        onPress={() => setSelectedServiceId(s.id)}
                                    >
                                        <Text style={[styles.chipText, selectedServiceId === s.id && styles.whiteText]}>{s.name}</Text>
                                        <Text style={[styles.chipPrice, selectedServiceId === s.id && styles.whiteTextMuted]}>${s.price}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {/* SECCIÓN 4: FECHA Y HORA */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="time" size={24} color={THEME.primary} />
                            <Text style={styles.sectionTitle}>FECHA Y HORA</Text>
                        </View>
                        
                        <View style={styles.dateContainer}>
                            {Platform.OS === 'android' && (
                                <TouchableOpacity style={styles.androidDateBtn} onPress={() => setShowDatePicker(true)}>
                                    <Text style={styles.dateText}>{date.toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}</Text>
                                    <Ionicons name="calendar" size={20} color={THEME.primary} />
                                </TouchableOpacity>
                            )}
                            
                            {(showDatePicker || Platform.OS === 'ios') && (
                                <DateTimePicker
                                    value={date}
                                    mode="datetime"
                                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                    onChange={handleDateChange}
                                    minimumDate={new Date()}
                                    themeVariant="light"
                                    accentColor={THEME.primary}
                                />
                            )}
                        </View>
                    </View>

                    {/* SECCIÓN 5: NOTAS */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="chatbubble-ellipses" size={24} color={THEME.primary} />
                            <Text style={styles.sectionTitle}>NOTAS (OPCIONAL)</Text>
                        </View>
                        <TextInput
                            style={styles.textArea}
                            placeholder="Describe el problema o detalles adicionales..."
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={4}
                        />
                    </View>

                    <TouchableOpacity 
                        style={[styles.mainButton, saving && styles.buttonDisabled]}
                        onPress={handleSchedule}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text style={styles.mainButtonText}>CONFIRMAR CITA</Text>
                                <Ionicons name="checkmark-circle" size={24} color="white" />
                            </>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    headerGradient: {
        height: 120,
        width: '100%',
        position: 'absolute',
        top: 0,
    },
    scrollContent: {
        paddingTop: 140,
        paddingHorizontal: 20,
        paddingBottom: 60,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: THEME.bg,
    },
    loadingText: {
        marginTop: 10,
        color: THEME.textMuted,
        fontWeight: '600',
    },
    section: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '900',
        color: THEME.secondary,
        letterSpacing: 2,
    },
    horizontalScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    // Workshop Cards
    workshopCard: {
        width: 180,
        backgroundColor: THEME.card,
        padding: 15,
        borderRadius: 20,
        marginRight: 15,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    workshopCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    workshopCardName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: THEME.text,
        flex: 1,
    },
    workshopCardAddress: {
        fontSize: 11,
        color: THEME.textMuted,
        lineHeight: 14,
    },
    // Vehicle Cards
    vehicleCard: {
        width: 140,
        backgroundColor: THEME.card,
        padding: 15,
        borderRadius: 20,
        marginRight: 15,
        borderWidth: 1,
        borderColor: THEME.border,
        alignItems: 'center',
    },
    addCard: {
        width: 100,
        backgroundColor: THEME.bg,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: THEME.border,
        padding: 15,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addCardText: {
        fontSize: 12,
        color: THEME.textMuted,
        marginTop: 5,
        fontWeight: 'bold',
    },
    // Chips
    workshopChip: {
        backgroundColor: THEME.card,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        marginRight: 10,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    serviceChip: {
        backgroundColor: THEME.card,
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: THEME.border,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minWidth: '45%',
    },
    activeCard: {
        backgroundColor: THEME.primary,
        borderColor: THEME.primary,
        elevation: 8,
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    activeChip: {
        backgroundColor: THEME.primary,
        borderColor: THEME.primary,
    },
    // Texts
    cardTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: THEME.text,
        marginTop: 8,
    },
    cardSubtitle: {
        fontSize: 11,
        color: THEME.textMuted,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME.text,
    },
    chipPrice: {
        fontSize: 12,
        color: THEME.primary,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    whiteText: { color: 'white' },
    whiteTextMuted: { color: 'rgba(255,255,255,0.7)' },
    
    // Date/Time
    dateContainer: {
        backgroundColor: THEME.card,
        borderRadius: 20,
        padding: 10,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    androidDateBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
        color: THEME.text,
    },
    // Form
    textArea: {
        backgroundColor: THEME.card,
        borderRadius: 20,
        padding: 15,
        borderWidth: 1,
        borderColor: THEME.border,
        color: THEME.text,
        fontSize: 15,
        textAlignVertical: 'top',
        minHeight: 100,
    },
    mainButton: {
        backgroundColor: THEME.primary,
        height: 60,
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        marginTop: 20,
        elevation: 5,
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    mainButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    emptyButton: {
        padding: 20,
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: THEME.border,
        borderRadius: 20,
        alignItems: 'center',
    },
    emptyButtonText: {
        color: THEME.primary,
        fontWeight: 'bold',
    }
});
