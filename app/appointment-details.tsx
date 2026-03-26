import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

export default function AppointmentDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDetails();
    }, []);

    async function loadDetails() {
        const { data } = await supabase
            .from('appointments')
            .select(`
        *,
        vehicle:vehicles(*),
        service:service_catalog(*)
      `)
            .eq('id', id)
            .single();

        setAppointment(data);
        setLoading(false);
    }

    const onShare = async () => {
        try {
            await Share.share({
                message: `Mi cita en Autofix para el ${appointment.vehicle?.make || 'Vehículo'} ${appointment.vehicle?.model || ''}. Servicio: ${appointment.service?.name || 'Servicio'}.`,
            });
        } catch (error) {
            console.log(error);
        }
    };

    if (!appointment) return null;

    const isCancelled = appointment.status === 'cancelled';

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen options={{
                title: 'Detalle de Cita',
                headerTintColor: 'white',
                headerStyle: { backgroundColor: THEME.secondary },
                headerShadowVisible: false,
                headerTitleStyle: { fontWeight: '900', fontSize: 20 },
                headerRight: () => (
                    <TouchableOpacity onPress={onShare} style={{ marginRight: 10 }}>
                        <Ionicons name="share-social" size={24} color="white" />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                
                {isCancelled && (
                     <View style={styles.cancelledAlertBox}>
                          <Ionicons name="close-circle" size={24} color={THEME.danger} />
                          <Text style={styles.cancelledAlertText}>Esta cita fue rechazada / cancelada</Text>
                     </View>
                )}

                {/* Receipt Header */}
                <View style={[styles.receiptCard, isCancelled && { opacity: 0.8 }]}>
                    <View style={styles.topPattern} />

                    <View style={styles.receiptMain}>
                        <View style={styles.checkCircle}>
                            <Ionicons 
                              name={isCancelled ? "close-circle" : "checkmark-circle"} 
                              size={60} 
                              color={isCancelled ? THEME.danger : THEME.success} 
                            />
                        </View>
                        <Text style={styles.confirmedText}>
                          {isCancelled ? 'Reservación Anulada' : 'Reservación Activa'}
                        </Text>
                        <Text style={styles.idText}>ID: #{appointment.id.slice(0, 8).toUpperCase()}</Text>
                    </View>

                    <View style={styles.infoGrid}>
                        <InfoItem label="Vehículo" value={appointment.vehicle ? `${appointment.vehicle.make} ${appointment.vehicle.model}` : 'No especificado'} />
                        <InfoItem label="Placas" value={appointment.vehicle?.license_plate || 'N/A'} />
                        <InfoItem label="Fecha" value={new Date(appointment.scheduled_at).toLocaleDateString()} />
                        <InfoItem label="Hora" value={new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.serviceRow}>
                        <View>
                            <Text style={styles.serviceName}>{appointment.service?.name || 'Servicio General'}</Text>
                            <Text style={styles.serviceSubtitle}>Diagnóstico incluido</Text>
                        </View>
                    </View>

                    <View style={styles.bottomPattern} />
                </View>

                {/* Timeline Section */}
                {!isCancelled && (
                  <>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Progreso del Servicio</Text>
                    </View>
    
                    <View style={styles.timelineBox}>
                        <TimelineItem 
                          icon="calendar" 
                          title="Cita Agendada" 
                          sub="El servicio ha sido reservado" 
                          active={true} 
                        />
                        <TimelineItem 
                          icon="car" 
                          title="En Taller" 
                          sub="El taller aceptó y recibió el vehículo" 
                          active={appointment.status === 'confirmed' || appointment.status === 'completed'} 
                        />
                        <TimelineItem 
                          icon="ribbon" 
                          title="Entrega" 
                          sub="Servicio finalizado con éxito" 
                          active={appointment.status === 'completed'} 
                          last 
                        />
                    </View>
                  </>
                )}

                <TouchableOpacity style={styles.supportButton}>
                    <Ionicons name="chatbubble-ellipses" size={20} color="white" />
                    <Text style={styles.supportText}>Contactar Soporte</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

function InfoItem({ label, value }: { label: string, value: string }) {
    return (
        <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

function TimelineItem({ icon, title, sub, active, last }: any) {
    return (
        <View style={styles.tlItem}>
            <View style={styles.tlLeft}>
                <View style={[styles.tlIcon, active && styles.tlIconActive]}>
                    <Ionicons name={icon} size={20} color={active ? 'white' : THEME.border} />
                </View>
                {!last && <View style={[styles.tlLine, active && styles.tlLineActive]} />}
            </View>
            <View style={styles.tlRight}>
                <Text style={[styles.tlTitle, active && styles.tlTitleActive]}>{title}</Text>
                <Text style={styles.tlSub}>{sub}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    content: {
        padding: 20,
    },
    cancelledAlertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        padding: 18,
        borderRadius: 16,
        marginBottom: 20,
        gap: 12,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    cancelledAlertText: {
        color: THEME.danger,
        fontWeight: '900',
        fontSize: 16,
    },
    receiptCard: {
        backgroundColor: THEME.card,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: THEME.border,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        marginBottom: 30,
    },
    topPattern: {
        height: 12,
        backgroundColor: THEME.secondary,
        opacity: 0.9,
    },
    receiptMain: {
        padding: 30,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: THEME.border,
        borderStyle: 'dashed',
    },
    checkCircle: {
        marginBottom: 16,
    },
    confirmedText: {
        fontSize: 22,
        fontWeight: '900',
        color: THEME.secondary,
        textAlign: 'center',
    },
    idText: {
        fontSize: 13,
        color: THEME.textSoft,
        marginTop: 6,
        fontWeight: '800',
        letterSpacing: 2,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 20,
    },
    infoItem: {
        width: '50%',
        padding: 10,
    },
    infoLabel: {
        fontSize: 12,
        color: THEME.textSoft,
        textTransform: 'uppercase',
        fontWeight: '800',
        marginBottom: 6,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '900',
        color: THEME.text,
    },
    divider: {
        height: 1,
        backgroundColor: THEME.border,
        marginHorizontal: 30,
    },
    serviceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 30,
        paddingBottom: 25,
    },
    serviceName: {
        fontSize: 18,
        fontWeight: '900',
        color: THEME.secondary,
    },
    serviceSubtitle: {
        fontSize: 14,
        color: THEME.primary,
        fontWeight: '800',
        marginTop: 4,
    },
    bottomPattern: {
        height: 8,
        backgroundColor: THEME.primary,
        opacity: 0.8,
    },
    sectionHeader: {
        marginBottom: 16,
        paddingLeft: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: THEME.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    timelineBox: {
        backgroundColor: THEME.card,
        borderRadius: 24,
        padding: 24,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: THEME.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
    },
    tlItem: {
        flexDirection: 'row',
        minHeight: 70,
    },
    tlLeft: {
        alignItems: 'center',
        width: 32,
        marginRight: 16,
    },
    tlIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: THEME.bg,
        borderWidth: 1,
        borderColor: THEME.border,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    tlIconActive: {
        backgroundColor: THEME.primary,
        borderColor: THEME.primary,
    },
    tlLine: {
        flex: 1,
        width: 3,
        backgroundColor: THEME.border,
        marginVertical: -2,
    },
    tlLineActive: {
        backgroundColor: THEME.primary,
    },
    tlRight: {
        flex: 1,
        paddingBottom: 25,
    },
    tlTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: THEME.textSoft,
    },
    tlTitleActive: {
        color: THEME.text,
    },
    tlSub: {
        fontSize: 14,
        color: THEME.textSoft,
        marginTop: 4,
        fontWeight: '500',
    },
    supportButton: {
        backgroundColor: THEME.secondary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 10,
        marginBottom: 40,
        elevation: 2,
    },
    supportText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 16,
    }
});
