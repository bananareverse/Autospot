import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
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
    primary: '#2563EB',
    secondary: '#1E3A8A',
    border: '#E5E7EB',
    cardBg: '#F9FAFB',
};

export default function ScheduleAppointmentScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form Data
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);

    // Selection
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        try {
            const [vData, sData] = await Promise.all([
                getUserVehicles(''), // userId handled inside service
                supabase.from('service_catalog').select('*').eq('active', true)
            ]);

            setVehicles(vData || []);
            setServices(sData.data || []);

            if (vData && vData.length > 0) {
                setSelectedVehicleId(vData[0].id);
            }
            if (sData.data && sData.data.length > 0) {
                setSelectedServiceId(sData.data[0].id);
            }
        } catch (e) {
            console.log(e);
            Alert.alert('Error', 'No se pudo cargar la información inicial');
        } finally {
            setLoading(false);
        }
    }

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
                                    {vehicles.map((v) => (
                                        <Picker.Item key={v.id} label={`${v.make} ${v.model} (${v.license_plate})`} value={v.id} />
                                    ))}
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

                    {/* Service Selection */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Tipo de Servicio</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedServiceId}
                                onValueChange={itemValue => setSelectedServiceId(itemValue)}
                                style={styles.picker}
                            >
                                <Picker.Item label="Selecciona un servicio..." value="" />
                                {services.map((s) => (
                                    <Picker.Item key={s.id} label={s.name} value={s.id} />
                                ))}
                            </Picker>
                        </View>
                        {selectedServiceId && services.find(s => s.id === selectedServiceId) && (
                            <View style={styles.serviceDetailBox}>
                                <Text style={styles.serviceDescription}>
                                    {services.find(s => s.id === selectedServiceId)?.description}
                                </Text>
                                <View style={styles.priceBadge}>
                                    <Text style={styles.priceLabel}>Precio Estimado:</Text>
                                    <Text style={styles.priceValue}>
                                        ${services.find(s => s.id === selectedServiceId)?.estimated_price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </Text>
                                </View>
                            </View>
                        )}
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

                    {/* Resumen de Costos (The Cool Part) */}
                    {selectedServiceId && (
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Mano de obra y refacciones</Text>
                                <Text style={styles.summaryValue}>
                                    ${services.find(s => s.id === selectedServiceId)?.estimated_price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Diagnóstico básico</Text>
                                <Text style={[styles.summaryValue, { color: '#10B981' }]}>Incluido</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Total Estimado</Text>
                                <Text style={styles.totalValue}>
                                    ${services.find(s => s.id === selectedServiceId)?.estimated_price?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </Text>
                            </View>
                        </View>
                    )}
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
        borderLeftColor: THEME.primary,
    },
    serviceDescription: {
        fontSize: 14,
        color: THEME.textLight,
        lineHeight: 20,
        marginBottom: 8,
    },
    priceBadge: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: THEME.text,
    },
    priceValue: {
        fontSize: 16,
        fontWeight: '800',
        color: THEME.primary,
    },
    summaryCard: {
        backgroundColor: '#1E3A8A',
        padding: 20,
        borderRadius: 16,
        marginTop: 20,
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
    },
    summaryValue: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 12,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    totalValue: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '900',
    }
});
