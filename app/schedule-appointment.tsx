import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserVehicles } from '@/lib/vehicles';
import { scheduleAppointment } from '@/lib/appointments';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';

const THEME = {
    background: '#FFFFFF',
    text: '#1F2937',
    textLight: '#6B7280',
    primary: '#219ebc',
    secondary: '#023047',
    border: '#E5E7EB',
    cardBg: '#F9FAFB',
};

export default function ScheduleAppointmentScreen() {
    const router = useRouter();
    const { workshopId } = useLocalSearchParams<{ workshopId?: string | string[] }>();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // State
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [workshops, setWorkshops] = useState<any[]>([]);
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>(
        Array.isArray(workshopId) ? workshopId[0] : (workshopId || '')
    );
    const [loadingServices, setLoadingServices] = useState(false);
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [notes, setNotes] = useState('');

    const [serviceSearch, setServiceSearch] = useState('');

    useEffect(() => {
        async function loadInitialData() {
            try {
                // 1. Cargar TODOS los Talleres (sin filtrar por status para asegurar visibilidad)
                const { data: wData } = await supabase
                    .from('workshops')
                    .select('id, name');
                setWorkshops(wData || []);

                // Si hay talleres y no hay uno seleccionado, seleccionar el primero
                if (wData && wData.length > 0 && !selectedWorkshopId) {
                    setSelectedWorkshopId(wData[0].id);
                }

                // 2. Cargar Vehículos del usuario
                const vData = await getUserVehicles('');
                setVehicles(vData || []);
                if (vData && vData.length > 0) {
                    setSelectedVehicleId(vData[0].id);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        loadInitialData();
    }, []);

    useEffect(() => {
        async function loadFilteredServices() {
            if (!selectedWorkshopId) {
                setServices([]);
                return;
            }
            setLoadingServices(true);
            try {
                const { data, error } = await supabase.from('workshop_services')
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
                                description: s?.description,
                                price: item.custom_price || s?.estimated_price,
                            };
                        });
                    setServices(normalized);
                    if (normalized.length > 0) {
                        setSelectedServiceId(normalized[0].id);
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingServices(false);
            }
        }
        loadFilteredServices();
    }, [selectedWorkshopId]);




    // State for separate pickers on Android
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

    const onChangeDate = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            if (event.type === 'set' && selectedDate) {
                const currentDate = selectedDate;
                if (pickerMode === 'date') {
                    // After picking date, show time picker
                    setDate(currentDate);
                    setPickerMode('time');
                    // Delay showing the next picker to avoid conflicts
                    setTimeout(() => setShowDatePicker(true), 100);
                } else {
                    // Finished picking both
                    setDate(currentDate);
                    setPickerMode('date'); // Reset for next time
                }
            } else {
                setPickerMode('date'); // Reset on cancel
            }
        } else {
            // iOS logic (standard)
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) setDate(selectedDate);
        }
    };

    const showPicker = () => {
        setPickerMode('date');
        setShowDatePicker(true);
    };

    // Safe date string
    const formatDate = (d: Date) => {
        try {
            return d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        } catch (e) {
            return d.toDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    };

    async function handleSchedule() {
        if (!selectedVehicleId) {
            Alert.alert('Faltan datos', 'Debes registrar al menos un vehículo primero');
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

            Alert.alert('¡Listo!', 'Tu cita ha sido agendada con éxito.', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={THEME.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Stack.Screen options={{ title: 'Agendar Cita', headerBackTitle: 'Volver' }} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.content}>
                    <Text style={styles.sectionTitle}>Detalles de la Cita</Text>

                    {/* Vehicle Selection */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Selecciona tu Vehículo</Text>
                        <View style={styles.pickerContainer}>
                            {vehicles.length > 0 ? (
                                <Picker
                                    selectedValue={selectedVehicleId}
                                    onValueChange={itemValue => setSelectedVehicleId(itemValue)}
                                    style={styles.picker}
                                >
                                    {vehicles.length === 0 ? (
                                        <Picker.Item label="Registra un vehículo primero" value="" />
                                    ) : (
                                        vehicles.map((v) => (
                                            <Picker.Item key={v.id} label={`${v.make} ${v.model} (${v.license_plate})`} value={v.id} />
                                        ))
                                    )}
                                </Picker>
                            ) : (
                                <TouchableOpacity
                                    style={styles.emptyPicker}
                                    onPress={() => router.push('/my-vehicles')}
                                >
                                    <Text style={styles.emptyPickerText}>No tienes vehículos. Registrar aquí.</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Selecciona un Taller</Text>
                        <View style={styles.pickerContainer}>
                            <Picker selectedValue={selectedWorkshopId}
                                onValueChange={itemValue => setSelectedWorkshopId(itemValue)}
                                style={styles.picker}
                            >
                                {workshops.length === 0 ? (
                                    <Picker.Item label="No se encontraron talleres" value="" />
                                ) : (
                                    workshops.map((w) => (
                                        <Picker.Item key={w.id} label={w.name} value={w.id} />
                                    ))
                                )}
                            </Picker>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Servicios Disponibles en este Taller</Text>
                        <View style={styles.pickerContainer}>
                            {loadingServices ? (
                                <View style={{ padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <ActivityIndicator size="small" color={THEME.primary} />
                                    <Text style={{ color: THEME.textLight }}>Cargando servicios...</Text>
                                </View>
                            ) : (
                                <Picker
                                    selectedValue={selectedServiceId}
                                    onValueChange={(val) => setSelectedServiceId(val)}
                                    enabled={services.length > 0}
                                    style={styles.picker}
                                >
                                    {services.length === 0 ? (
                                        <Picker.Item label="Selecciona un taller primero..." value="" />
                                    ) : (
                                        services.map(s => (
                                            <Picker.Item key={s.id} label={`${s.name} ($${s.price || 0})`} value={s.id} />
                                        ))
                                    )}
                                </Picker>
                            )}
                        </View>
                    </View>

                    {/* Date & Time */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Fecha y Hora</Text>
                        <TouchableOpacity
                            style={styles.dateSelector}
                            onPress={showPicker}
                        >
                            <Ionicons name="calendar-outline" size={20} color={THEME.primary} />
                            <Text style={styles.dateSelectorText}>
                                {formatDate(date)}
                            </Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={date}
                                mode={Platform.OS === 'ios' ? 'datetime' : pickerMode}
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onChangeDate}
                                minimumDate={new Date()}
                            />
                        )}
                    </View>

                    {/* Notes */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Notas adicionales / Fallas detectadas</Text>
                        <TextInput
                            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                            placeholder="Ej: El freno suena al pisar, cambio de aceite sintético..."
                            multiline
                            value={notes}
                            onChangeText={setNotes}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.scheduleButton, saving && { opacity: 0.7 }]}
                        onPress={handleSchedule}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.scheduleButtonText}>Confirmar Reservación</Text>
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
        backgroundColor: '#FFFFFF',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 24,
        gap: 20,
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: THEME.secondary,
        marginBottom: 10,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME.text,
    },
    pickerContainer: {
        backgroundColor: THEME.cardBg,
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 12,
        overflow: 'hidden',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: THEME.cardBg,
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    searchInput: {
        flex: 1,
        height: 46,
        fontSize: 15,
        color: THEME.text,
    },
    searchHint: {
        color: THEME.textLight,
        fontSize: 13,
    },
    picker: {
        height: 50,
        width: '100%',
    },
    emptyPicker: {
        padding: 15,
        alignItems: 'center',
    },
    emptyPickerText: {
        color: THEME.primary,
        fontWeight: 'bold',
    },
    dateSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.cardBg,
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    dateSelectorText: {
        fontSize: 16,
        color: THEME.text,
    },
    input: {
        backgroundColor: THEME.cardBg,
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: THEME.text,
    },
    scheduleButton: {
        backgroundColor: THEME.primary,
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    scheduleButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    serviceDetailBox: {
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 12,
        marginTop: 4,
        borderLeftWidth: 4,
        borderLeftColor: '#219ebc',
    },
    serviceDescription: {
        fontSize: 14,
        color: THEME.textLight,
        lineHeight: 20,
    }
});
