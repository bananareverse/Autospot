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

    const onChangeDate = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
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
                    </View>

                    {/* Date & Time */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Fecha y Hora</Text>
                        <TouchableOpacity
                            style={styles.dateSelector}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Ionicons name="calendar-outline" size={20} color={THEME.primary} />
                            <Text style={styles.dateSelectorText}>
                                {date.toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
                            </Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            <DateTimePicker
                                value={date}
                                mode="datetime"
                                display="default"
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
});
