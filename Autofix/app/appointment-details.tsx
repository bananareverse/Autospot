import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function AppointmentDetailsScreen() {
    const theme = useAppTheme();
    const styles = getStyles(theme);

    const params = useLocalSearchParams();
    const appointmentId = Array.isArray(params.appointmentId)
        ? params.appointmentId[0]
        : params.appointmentId;
    const router = useRouter();
    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        loadDetails();
    }, []);

    function translateStatus(status: string): string {
        switch (status.toLowerCase()) {
            case 'scheduled':
                return 'Programada';
            case 'confirmed':
                return 'Confirmada';
            case 'completed':
                return 'Completada';
            case 'cancelled':
                return 'Cancelada';
            default:
                return status;
        }
    }

    async function handleConfirmAppointment() {
        try {
            console.log('Intentando confirmar cita:', appointmentId);

            const { data, error } = await supabase
                .from('appointments')
                .update({ status: 'confirmed' })
                .eq('id', appointmentId)
                .select();

            console.log('Respuesta de confirmación:', { data, error });

            if (error) {
                Alert.alert('Error', `No se pudo confirmar la cita: ${error.message}`);
                console.error('Error confirming appointment:', error);
            } else {
                Alert.alert('Éxito', 'Cita confirmada exitosamente');
                // Actualizar estado local
                setAppointment({ ...appointment, status: 'confirmed' });
                // Volver a la agenda después de 1 segundo
                setTimeout(() => {
                    router.back();
                }, 1000);
            }
        } catch (err) {
            console.error('Error en handleConfirmAppointment:', err);
            Alert.alert('Error', 'Ocurrió un error inesperado al confirmar la cita');
        }
    }

    async function handleRejectAppointment() {
        if (!rejectReason.trim()) {
            Alert.alert('Error', 'Por favor ingresa una razón para rechazar la cita');
            return;
        }

        try {
            console.log('Intentando cancelar cita:', appointmentId);
            console.log('Razón de cancelación:', rejectReason);

            const { data, error } = await supabase
                .from('appointments')
                .update({
                    status: 'cancelled',
                    notes: rejectReason
                })
                .eq('id', appointmentId)
                .select();

            console.log('Respuesta de actualización:', { data, error });

            if (error) {
                Alert.alert('Error', `No se pudo cancelar la cita: ${error.message}`);
                console.error('Error rejecting appointment:', error);
            } else {
                Alert.alert('Éxito', 'Cita cancelada exitosamente');
                setShowRejectModal(false);
                setRejectReason('');
                // Actualizar estado local
                setAppointment({ ...appointment, status: 'cancelled', notes: rejectReason });
                // Volver a la agenda después de 1 segundo
                setTimeout(() => {
                    router.back();
                }, 1000);
            }
        } catch (err) {
            console.error('Error en handleRejectAppointment:', err);
            Alert.alert('Error', 'Ocurrió un error inesperado al cancelar la cita');
        }
    }

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
        vehicle:vehicles(*),
        service:service_catalog(*),
        client:clients(*)
      `)
                .eq('id', appointmentId)
                .single();

            if (queryError) {
                console.error('Error fetching appointment:', queryError);
                setError('No se pudo cargar la cita');
            } else {
                let finalPrice = data.service?.estimated_price;
                if (data.workshop_id && data.service_id) {
                    const { data: ws } = await supabase
                        .from('workshop_services')
                        .select('custom_price')
                        .eq('workshop_id', data.workshop_id)
                        .eq('service_id', data.service_id)
                        .maybeSingle();
                    if (ws?.custom_price) {
                        finalPrice = ws.custom_price;
                    }
                }
                data.final_price = finalPrice;
                setAppointment(data);
            }
        } catch (e) {
            console.error('Error:', e);
            setError('Error al cargar los detalles');
        } finally {
            setLoading(false);
        }
    }

    const onShare = async () => {
        try {
            await Share.share({
                message: `Mi reservación en Autofix para el ${appointment.vehicle.make} ${appointment.vehicle.model}. Servicio: ${appointment.service.name}`,
            });
        } catch (error) {
            console.log(error);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <Text style={styles.loadingText}>Cargando...</Text>
            </View>
        );
    }

    if (error || !appointment) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <Text style={styles.errorText}>{error || 'No se encontraron detalles de la cita'}</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>Volver</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Stack.Screen options={{
                title: 'Detalles de Cita',
                headerTitleStyle: { color: theme.text },
                headerStyle: { backgroundColor: theme.bg },
                headerRight: () => (
                    <TouchableOpacity onPress={onShare}>
                        <Ionicons name="share-outline" size={24} color={theme.primary} />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Header with Status */}
                <View style={styles.headerSection}>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{translateStatus(appointment.status).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.appointmentId}>ID: {appointment.id.slice(0, 8).toUpperCase()}</Text>
                </View>

                {/* Cliente Section */}
                <SectionCard title="CLIENTE" icon="person" theme={theme} styles={styles}>
                    {appointment.client ? (
                        <>
                            <DetailRow label="Nombre" value={`${appointment.client.first_name || ''} ${appointment.client.last_name || ''}`.trim() || 'N/A'} styles={styles} />
                            <DetailRow label="Email" value={appointment.client.email || 'N/A'} styles={styles} />
                            <DetailRow label="Teléfono" value={appointment.client.phone || 'N/A'} styles={styles} />
                        </>
                    ) : (
                        <Text style={styles.noDataText}>No hay información del cliente</Text>
                    )}
                </SectionCard>

                {/* Vehículo Section */}
                <SectionCard title="VEHÍCULO" icon="car" theme={theme} styles={styles}>
                    {appointment.vehicle ? (
                        <>
                            <DetailRow label="Marca" value={appointment.vehicle.make || 'N/A'} styles={styles} />
                            <DetailRow label="Modelo" value={appointment.vehicle.model || 'N/A'} styles={styles} />
                            <DetailRow label="Placas" value={appointment.vehicle.license_plate || 'N/A'} styles={styles} />
                            <DetailRow label="Año" value={appointment.vehicle.year?.toString() || 'N/A'} styles={styles} />
                            <DetailRow label="Color" value={appointment.vehicle.color || 'N/A'} styles={styles} />
                        </>
                    ) : (
                        <Text style={styles.noDataText}>No hay información del vehículo</Text>
                    )}
                </SectionCard>

                {/* Cita Section */}
                <SectionCard title="CITA" icon="calendar" theme={theme} styles={styles}>
                    <DetailRow
                        label="Fecha"
                        value={new Date(appointment.scheduled_at).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                        styles={styles}
                    />
                    <DetailRow
                        label="Hora"
                        value={new Date(appointment.scheduled_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                        styles={styles}
                    />
                    <DetailRow label="Estado" value={translateStatus(appointment.status)} styles={styles} />
                    {appointment.notes && (
                        <DetailRow label="Notas Cliente" value={appointment.notes} styles={styles} />
                    )}
                </SectionCard>

                {/* Servicio Section */}
                <SectionCard title="SERVICIO" icon="construct" theme={theme} styles={styles}>
                    {appointment.service ? (
                        <>
                            <DetailRow label="Nombre" value={appointment.service.name || 'N/A'} styles={styles} />
                            <DetailRow label="Descripción" value={appointment.service.description || 'N/A'} styles={styles} />
                            <DetailRow
                                label="Precio Estimado"
                                value={appointment.final_price != null ? `$${appointment.final_price.toFixed(2)}` : 'N/A'}
                                styles={styles}
                            />
                        </>
                    ) : (
                        <Text style={styles.noDataText}>No hay información del servicio</Text>
                    )}
                </SectionCard>

                {/* Action Buttons - Only show for scheduled appointments */}
                {appointment.status === 'scheduled' && (
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.confirmButton]}
                            onPress={handleConfirmAppointment}
                        >
                            <Ionicons name="checkmark-circle" size={20} color="white" />
                            <Text style={styles.actionButtonText}>Confirmar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.rejectButton]}
                            onPress={() => setShowRejectModal(true)}
                        >
                            <Ionicons name="close-circle" size={20} color="white" />
                            <Text style={styles.actionButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Reject Modal */}
            <Modal
                visible={showRejectModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowRejectModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Cancelar Cita</Text>
                        <Text style={styles.modalSubtitle}>
                            Por favor ingresa la razón para cancelar esta cita:
                        </Text>
                        <TextInput
                            style={styles.rejectInput}
                            multiline={true}
                            numberOfLines={4}
                            placeholder="Razón del rechazo..."
                            placeholderTextColor={theme.textMuted}
                            value={rejectReason}
                            onChangeText={setRejectReason}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelModalButton]}
                                onPress={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                }}
                            >
                                <Text style={styles.cancelModalButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.confirmModalButton]}
                                onPress={handleRejectAppointment}
                            >
                                <Text style={styles.confirmModalButtonText}>Rechazar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

function SectionCard({ title, icon, children, theme, styles }: any) {
    return (
        <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
                <Ionicons name={icon as any} size={20} color={theme.primary} />
                <Text style={styles.sectionTitle}>{title}</Text>
            </View>
            <View style={styles.sectionContent}>
                {children}
            </View>
        </View>
    );
}

function DetailRow({ label, value, styles }: { label: string; value: string; styles: any }) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}:</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    loadingText: {
        fontSize: 16,
        color: theme.text,
    },
    errorText: {
        fontSize: 16,
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: theme.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 6,
    },
    backButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    content: {
        padding: 16,
        paddingBottom: 32,
    },
    headerSection: {
        marginBottom: 24,
        alignItems: 'center',
    },
    statusBadge: {
        backgroundColor: '#10B981',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 12,
    },
    statusText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 12,
    },
    appointmentId: {
        fontSize: 14,
        color: theme.textMuted,
        fontWeight: '600',
    },
    sectionCard: {
        backgroundColor: theme.card,
        borderRadius: 12,
        marginBottom: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: theme.border,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.bg,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.text,
        marginLeft: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionContent: {
        padding: 16,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    detailLabel: {
        fontSize: 13,
        color: theme.textMuted,
        fontWeight: '600',
        flex: 1,
    },
    detailValue: {
        fontSize: 13,
        color: theme.text,
        fontWeight: '500',
        flex: 1,
        textAlign: 'right',
    },
    noDataText: {
        fontSize: 13,
        color: theme.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 8,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
    },
    confirmButton: {
        backgroundColor: '#10B981',
    },
    rejectButton: {
        backgroundColor: '#EF4444',
    },
    actionButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: theme.card,
        borderRadius: 12,
        padding: 20,
        width: '90%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: theme.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: theme.textMuted,
        marginBottom: 16,
        textAlign: 'center',
    },
    rejectInput: {
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: theme.text,
        backgroundColor: theme.bg,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelModalButton: {
        backgroundColor: theme.bg,
        borderWidth: 1,
        borderColor: theme.border,
    },
    confirmModalButton: {
        backgroundColor: '#EF4444',
    },
    cancelModalButtonText: {
        color: theme.text,
        fontWeight: '600',
    },
    confirmModalButtonText: {
        color: 'white',
        fontWeight: '600',
    },
});