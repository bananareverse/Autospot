import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const THEME = {
    primary: '#2563EB',
    secondary: '#1E3A8A',
    bg: '#F9FAFB',
    text: '#1F2937',
    textLight: '#6B7280',
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
                message: `Mi reservación en Autofix para el ${appointment.vehicle.make} ${appointment.vehicle.model}. Servicio: ${appointment.service.name}`,
            });
        } catch (error) {
            console.log(error);
        }
    };

    if (!appointment) return null;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Stack.Screen options={{
                title: 'Detalle de Cita',
                headerRight: () => (
                    <TouchableOpacity onPress={onShare}>
                        <Ionicons name="share-outline" size={24} color={THEME.primary} />
                    </TouchableOpacity>
                )
            }} />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Receipt Header */}
                <View style={styles.receiptCard}>
                    <View style={styles.topPattern} />

                    <View style={styles.receiptMain}>
                        <View style={styles.checkCircle}>
                            <Ionicons name="checkmark-done-circle" size={60} color="#10B981" />
                        </View>
                        <Text style={styles.confirmedText}>Reservación Confirmada</Text>
                        <Text style={styles.idText}>ID: #{appointment.id.slice(0, 8).toUpperCase()}</Text>
                    </View>

                    <View style={styles.infoGrid}>
                        <InfoItem label="Vehículo" value={`${appointment.vehicle.make} ${appointment.vehicle.model}`} />
                        <InfoItem label="Placas" value={appointment.vehicle.license_plate} />
                        <InfoItem label="Fecha" value={new Date(appointment.scheduled_at).toLocaleDateString()} />
                        <InfoItem label="Hora" value={new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.serviceRow}>
                        <View>
                            <Text style={styles.serviceName}>{appointment.service.name}</Text>
                            <Text style={styles.serviceSubtitle}>Diagnóstico incluido</Text>
                        </View>
                        <Text style={styles.servicePrice}>${appointment.service.estimated_price?.toLocaleString()}</Text>
                    </View>

                    <View style={styles.totalBox}>
                        <Text style={styles.totalLabel}>Total Estimado</Text>
                        <Text style={styles.totalValue}>${appointment.service.estimated_price?.toLocaleString()}</Text>
                    </View>

                    <View style={styles.bottomPattern} />
                </View>

                {/* Timeline Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Progreso del Servicio</Text>
                </View>

                <View style={styles.timelineBox}>
                    <TimelineItem icon="calendar" title="Cita Agendada" sub="El servicio ha sido reservado" active={true} />
                    <TimelineItem icon="checkmark-circle" title="Confirmación" sub="Taller ha aceptado la cita" active={appointment.status !== 'scheduled'} />
                    <TimelineItem icon="car" title="En Taller" sub="Tu vehículo está en manos expertas" active={appointment.status === 'completed'} />
                    <TimelineItem icon="ribbon" title="Entrega" sub="Servicio finalizado con éxito" active={false} last />
                </View>

                <TouchableOpacity style={styles.supportButton}>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="white" />
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
                    <Ionicons name={icon} size={18} color={active ? 'white' : THEME.textLight} />
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
        padding: 24,
    },
    receiptCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
        marginBottom: 30,
    },
    topPattern: {
        height: 10,
        backgroundColor: THEME.primary,
        opacity: 0.8,
    },
    receiptMain: {
        padding: 30,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        borderStyle: 'dashed',
    },
    checkCircle: {
        marginBottom: 16,
    },
    confirmedText: {
        fontSize: 22,
        fontWeight: '900',
        color: THEME.secondary,
    },
    idText: {
        fontSize: 12,
        color: THEME.textLight,
        marginTop: 4,
        fontWeight: '700',
        letterSpacing: 1,
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
        fontSize: 11,
        color: THEME.textLight,
        textTransform: 'uppercase',
        fontWeight: '700',
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: 'bold',
        color: THEME.text,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginHorizontal: 30,
    },
    serviceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 30,
        paddingBottom: 20,
    },
    serviceName: {
        fontSize: 17,
        fontWeight: 'bold',
        color: THEME.text,
    },
    serviceSubtitle: {
        fontSize: 13,
        color: '#10B981',
        fontWeight: '600',
        marginTop: 2,
    },
    servicePrice: {
        fontSize: 18,
        fontWeight: '800',
        color: THEME.text,
    },
    totalBox: {
        backgroundColor: THEME.secondary,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        paddingHorizontal: 30,
    },
    totalLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontWeight: 'bold',
    },
    totalValue: {
        color: 'white',
        fontSize: 24,
        fontWeight: '900',
    },
    bottomPattern: {
        height: 6,
        backgroundColor: THEME.secondary,
        opacity: 0.2,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: THEME.secondary,
    },
    timelineBox: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        marginBottom: 30,
    },
    tlItem: {
        flexDirection: 'row',
        minHeight: 60,
    },
    tlLeft: {
        alignItems: 'center',
        width: 30,
        marginRight: 16,
    },
    tlIcon: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    tlIconActive: {
        backgroundColor: THEME.primary,
    },
    tlLine: {
        flex: 1,
        width: 2,
        backgroundColor: '#F3F4F6',
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
        fontSize: 15,
        fontWeight: 'bold',
        color: THEME.textLight,
    },
    tlTitleActive: {
        color: THEME.text,
    },
    tlSub: {
        fontSize: 13,
        color: THEME.textLight,
        marginTop: 2,
    },
    supportButton: {
        backgroundColor: THEME.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        gap: 10,
        marginBottom: 40,
    },
    supportText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
