import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

const THEME = {
    primary: '#219ebc',
    secondary: '#023047',
    accent: '#fb8500',
    bg: '#FFFFFF',
    card: '#F9FAFB',
    text: '#1F2937',
    textMuted: '#6B7280',
    border: '#E5E7EB',
    white: '#FFFFFF',
    danger: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; step: number }> = {
    scheduled: { label: 'Programada', color: THEME.primary, icon: 'calendar', step: 1 },
    confirmed: { label: 'Confirmada', color: '#06B6D4', icon: 'checkmark-done', step: 2 },
    in_progress: { label: 'En Proceso', color: THEME.accent, icon: 'construct', step: 3 },
    ready: { label: 'Lista', color: THEME.success, icon: 'sparkles', step: 4 },
    completed: { label: 'Completada', color: '#6366F1', icon: 'flag', step: 5 },
    cancelled: { label: 'Cancelada', color: THEME.danger, icon: 'close-circle', step: 0 },
};

export default function ClientAppointmentDetailsScreen() {
    const params = useLocalSearchParams();
    const appointmentId = Array.isArray(params.appointmentId)
        ? params.appointmentId[0]
        : params.appointmentId;
    const router = useRouter();

    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        loadDetails();
    }, []);

    async function loadDetails() {
        try {
            if (!appointmentId) {
                setError('ID de cita no encontrado');
                setLoading(false);
                return;
            }

            const { data, error: queryError } = await supabase
                .from('appointments')
                .select(`
                    *,
                    vehicle:vehicles(make, model, license_plate, year, color),
                    service:service_catalog(name, description, estimated_price),
                    workshop:workshops(name, address, phone)
                `)
                .eq('id', appointmentId)
                .single();

            if (queryError) {
                setError('No se pudo cargar la cita');
                return;
            }

            // Obtener precio personalizado
            let finalPrice = data.service?.estimated_price;
            if (data.workshop_id && data.service_id) {
                const { data: ws } = await supabase
                    .from('workshop_services')
                    .select('custom_price')
                    .eq('workshop_id', data.workshop_id)
                    .eq('service_id', data.service_id)
                    .maybeSingle();
                if (ws?.custom_price) finalPrice = ws.custom_price;
            }
            data.final_price = finalPrice;
            setAppointment(data);
        } catch (e) {
            setError('Error al cargar detalles');
        } finally {
            setLoading(false);
        }
    }

    async function handleCancel() {
        Alert.alert(
            'Cancelar Cita',
            '¿Estás seguro de que quieres cancelar esta cita?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Sí, cancelar',
                    style: 'destructive',
                    onPress: async () => {
                        setCancelling(true);
                        const { error } = await supabase
                            .from('appointments')
                            .update({ status: 'cancelled' })
                            .eq('id', appointmentId);
                        setCancelling(false);
                        if (error) {
                            Alert.alert('Error', 'No se pudo cancelar');
                        } else {
                            setAppointment({ ...appointment, status: 'cancelled' });
                        }
                    }
                }
            ]
        );
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.primary} />
            </View>
        );
    }

    if (error || !appointment) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={60} color={THEME.danger} />
                <Text style={styles.errorText}>{error || 'Cita no encontrada'}</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const currentStatus = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen options={{ headerShown: false }} />

            <LinearGradient
                colors={[THEME.secondary, THEME.primary]}
                style={styles.headerGradient}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Custom Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Detalles de Cita</Text>
                    <TouchableOpacity 
                        style={styles.chatButton} 
                        onPress={() => router.push({ pathname: '/chat/[appointmentId]', params: { appointmentId: appointment.id } })}
                    >
                        <Ionicons name="chatbubbles" size={20} color="white" />
                        <Text style={styles.chatButtonText}>Chat</Text>
                    </TouchableOpacity>
                </View>

                {/* Status Hero Floating Card */}
                <View style={styles.statusCard}>
                    <View style={[styles.statusBadge, { backgroundColor: currentStatus.color + '20' }]}>
                        <Ionicons name={currentStatus.icon} size={20} color={currentStatus.color} />
                        <Text style={[styles.statusText, { color: currentStatus.color }]}>
                            {currentStatus.label.toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.appointmentId}>#{appointment.id.slice(0, 8).toUpperCase()}</Text>

                    {/* Timeline Tracker */}
                    {appointment.status !== 'cancelled' && (
                        <View style={styles.timelineContainer}>
                            {[1, 2, 3, 4, 5].map((step) => (
                                <View key={step} style={styles.timelineStepWrapper}>
                                    <View
                                        style={[
                                            styles.timelineStep,
                                            step <= currentStatus.step ? { backgroundColor: currentStatus.color } : styles.timelineStepInactive
                                        ]}
                                    />
                                    {step < 5 && (
                                        <View
                                            style={[
                                                styles.timelineLine,
                                                step < currentStatus.step ? { backgroundColor: currentStatus.color } : styles.timelineLineInactive
                                            ]}
                                        />
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Main Content Sections */}
                <View style={styles.sectionsContainer}>

                    {/* Info Card: Taller */}
                    <SectionCard title="Taller" icon="business-outline">
                        <Text style={styles.workshopName}>{appointment.workshop?.name}</Text>
                        <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={16} color={THEME.textMuted} />
                            <Text style={styles.infoValueText}>{appointment.workshop?.address}</Text>
                        </View>
                        {appointment.workshop?.phone && (
                            <View style={[styles.infoRow, { marginTop: 8 }]}>
                                <Ionicons name="call-outline" size={16} color={THEME.textMuted} />
                                <Text style={styles.infoValueText}>{appointment.workshop?.phone}</Text>
                            </View>
                        )}
                    </SectionCard>

                    {/* Info Card: Vehículo */}
                    <SectionCard title="Vehículo" icon="car-outline">
                        <View style={styles.vehicleHeader}>
                            <View style={styles.vehicleIconBox}>
                                <Ionicons name="car" size={30} color={THEME.primary} />
                            </View>
                            <View>
                                <Text style={styles.vehicleModel}>{appointment.vehicle?.make} {appointment.vehicle?.model}</Text>
                                <Text style={styles.vehiclePlate}>{appointment.vehicle?.license_plate}</Text>
                            </View>
                        </View>
                        <View style={styles.badgeRow}>
                            <TextBadge label={appointment.vehicle?.year?.toString()} icon="calendar" />
                            <TextBadge label={appointment.vehicle?.color} icon="color-palette" />
                        </View>
                    </SectionCard>

                    {/* Info Card: Servicio y Horario */}
                    <SectionCard title="Servicio y Horario" icon="time-outline">
                        <View style={styles.serviceBox}>
                            <Text style={styles.serviceName}>{appointment.service?.name}</Text>
                            <Text style={styles.servicePrice}>${appointment.final_price?.toLocaleString() || '0.00'}</Text>
                        </View>

                        <View style={styles.dateTimeContainer}>
                            <View style={styles.dateTimeItem}>
                                <Ionicons name="calendar-clear" size={18} color={THEME.primary} />
                                <View>
                                    <Text style={styles.dateTimeLabel}>Fecha</Text>
                                    <Text style={styles.dateTimeValue}>
                                        {new Date(appointment.scheduled_at).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.dateTimeDivider} />
                            <View style={styles.dateTimeItem}>
                                <Ionicons name="time" size={18} color={THEME.primary} />
                                <View>
                                    <Text style={styles.dateTimeLabel}>Hora</Text>
                                    <Text style={styles.dateTimeValue}>
                                        {new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {appointment.notes && (
                            <View style={styles.notesBox}>
                                <Text style={styles.notesLabel}>Notas adicionales:</Text>
                                <Text style={styles.notesText}>{appointment.notes}</Text>
                            </View>
                        )}
                    </SectionCard>

                    {/* Actions */}
                    {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                        <TouchableOpacity
                            style={[styles.cancelButton, cancelling && { opacity: 0.7 }]}
                            onPress={handleCancel}
                            disabled={cancelling}
                        >
                            <Ionicons name="close-circle-outline" size={20} color={THEME.danger} />
                            <Text style={styles.cancelButtonText}>{cancelling ? 'Cancelando...' : 'Cancelar Cita'}</Text>
                        </TouchableOpacity>
                    )}
                </View>

            </ScrollView>
        </View>
    );
}

function SectionCard({ title, icon, children }: any) {
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Ionicons name={icon} size={20} color={THEME.primary} />
                <Text style={styles.cardHeaderTitle}>{title.toUpperCase()}</Text>
            </View>
            <View style={styles.cardBody}>{children}</View>
        </View>
    );
}

function TextBadge({ label, icon }: { label: string; icon: any }) {
    if (!label) return null;
    return (
        <View style={styles.badge}>
            <Ionicons name={icon} size={12} color={THEME.textMuted} />
            <Text style={styles.badgeText}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: THEME.bg,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: THEME.bg,
    },
    errorText: {
        fontSize: 18,
        color: THEME.secondary,
        textAlign: 'center',
        marginTop: 20,
        fontWeight: 'bold',
    },
    backButton: {
        marginTop: 30,
        paddingHorizontal: 30,
        paddingVertical: 12,
        backgroundColor: THEME.primary,
        borderRadius: 12,
    },
    backButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    headerGradient: {
        height: 220,
        width: '100%',
        position: 'absolute',
        top: 0,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        marginBottom: 20,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: 'white',
        letterSpacing: 0.5,
    },
    chatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: THEME.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 4,
    },
    chatButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    },
    statusCard: {
        backgroundColor: 'white',
        marginHorizontal: 24,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 8,
        shadowColor: THEME.secondary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
        marginBottom: 12,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    appointmentId: {
        fontSize: 12,
        color: THEME.textMuted,
        fontWeight: 'bold',
    },
    timelineContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        paddingHorizontal: 10,
    },
    timelineStepWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timelineStep: {
        width: 12,
        height: 12,
        borderRadius: 6,
        zIndex: 1,
    },
    timelineStepInactive: {
        backgroundColor: '#E5E7EB',
    },
    timelineLine: {
        width: (width - 150) / 4,
        height: 3,
    },
    timelineLineInactive: {
        backgroundColor: '#F3F4F6',
    },
    sectionsContainer: {
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: THEME.border,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 10,
    },
    cardHeaderTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: THEME.secondary,
        letterSpacing: 1,
    },
    cardBody: {
        padding: 16,
    },
    workshopName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: THEME.secondary,
        marginBottom: 6,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    infoValueText: {
        fontSize: 14,
        color: THEME.textMuted,
        flex: 1,
        lineHeight: 20,
    },
    vehicleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    vehicleIconBox: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: 'rgba(33, 158, 188, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    vehicleModel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: THEME.secondary,
    },
    vehiclePlate: {
        fontSize: 14,
        color: THEME.primary,
        fontWeight: '900',
        letterSpacing: 1,
        marginTop: 2,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 10,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#F3F4F6',
        borderRadius: 10,
        gap: 6,
    },
    badgeText: {
        fontSize: 12,
        color: THEME.textMuted,
        fontWeight: 'bold',
    },
    serviceBox: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 15,
    },
    serviceName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: THEME.secondary,
        flex: 1,
    },
    servicePrice: {
        fontSize: 18,
        fontWeight: '900',
        color: THEME.primary,
    },
    dateTimeContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        justifyContent: 'space-around',
    },
    dateTimeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dateTimeLabel: {
        fontSize: 11,
        color: THEME.textMuted,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    dateTimeValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: THEME.secondary,
    },
    dateTimeDivider: {
        width: 1,
        height: '100%',
        backgroundColor: '#F3F4F6',
    },
    notesBox: {
        marginTop: 20,
        padding: 16,
        backgroundColor: 'rgba(251, 133, 0, 0.05)',
        borderRadius: 15,
        borderLeftWidth: 4,
        borderLeftColor: THEME.accent,
    },
    notesLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: THEME.accent,
        marginBottom: 4,
    },
    notesText: {
        fontSize: 14,
        color: THEME.text,
        lineHeight: 20,
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        marginTop: 10,
        gap: 10,
    },
    cancelButtonText: {
        color: THEME.danger,
        fontWeight: 'bold',
        fontSize: 16,
    }
});
