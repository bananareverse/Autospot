import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import { getUserAppointments, Appointment } from '@/lib/appointments';
import { useRouter } from 'expo-router';

const THEME = {
    background: '#FFFFFF',
    text: '#1F2937',
    textLight: '#6B7280',
    primary: '#2563EB',
    secondary: '#1E3A8A',
    border: '#E5E7EB',
    cardBg: '#FFFFFF',
    status: {
        scheduled: '#2563EB',
        confirmed: '#10B981',
        completed: '#6B7280',
        cancelled: '#EF4444',
    }
};

type TabType = 'programadas' | 'realizadas' | 'canceladas';

export default function AppointmentsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('programadas');

    const loadData = useCallback(async () => {
        try {
            const data = await getUserAppointments();
            setAppointments(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const filteredAppointments = appointments.filter(apt => {
        if (activeTab === 'programadas') return apt.status === 'scheduled' || apt.status === 'confirmed';
        if (activeTab === 'realizadas') return apt.status === 'completed';
        if (activeTab === 'canceladas') return apt.status === 'cancelled';
        return false;
    });

    const counts = {
        programadas: appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed').length,
        realizadas: appointments.filter(a => a.status === 'completed').length,
        canceladas: appointments.filter(a => a.status === 'cancelled').length,
    };

    if (loading && !refreshing) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={THEME.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <Text style={styles.title}>Citas</Text>
            </View>

            <View style={styles.tabsContainer}>
                <TabButton
                    label={`Programadas (${counts.programadas})`}
                    active={activeTab === 'programadas'}
                    onPress={() => setActiveTab('programadas')}
                />
                <TabButton
                    label={`Realizadas (${counts.realizadas})`}
                    active={activeTab === 'realizadas'}
                    onPress={() => setActiveTab('realizadas')}
                />
                <TabButton
                    label={`Canceladas (${counts.canceladas})`}
                    active={activeTab === 'canceladas'}
                    onPress={() => setActiveTab('canceladas')}
                />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} />}
            >
                {filteredAppointments.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.illustrationContainer}>
                            <Ionicons name="calendar-outline" size={80} color={THEME.primary} style={{ opacity: 0.8 }} />
                        </View>
                        <Text style={styles.emptyTitle}>No hay citas en esta categoría</Text>
                        <Text style={styles.emptySubtitle}>Agenda una cita y aparecerá en esta sección.</Text>
                        <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/schedule-appointment')}>
                            <Text style={styles.ctaButtonText}>Agendar Cita</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.list}>
                        {filteredAppointments.map((apt) => (
                            <TouchableOpacity
                                key={apt.id}
                                style={styles.card}
                                onPress={() => router.push({
                                    pathname: '/appointment-details',
                                    params: { id: apt.id }
                                })}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.vehicleInfo}>
                                        <Text style={styles.carText}>{apt.vehicle?.make} {apt.vehicle?.model}</Text>
                                        <Text style={styles.plateText}>{apt.vehicle?.license_plate}</Text>
                                    </View>
                                    <View style={styles.headerRight}>
                                        <View style={[styles.statusBadge, { backgroundColor: THEME.status[apt.status] + '15' }]}>
                                            <Text style={[styles.statusText, { color: THEME.status[apt.status] }]}>
                                                {apt.status === 'scheduled' ? 'Programada' :
                                                    apt.status === 'confirmed' ? 'Confirmada' :
                                                        apt.status === 'completed' ? 'Realizada' : 'Cancelada'}
                                            </Text>
                                        </View>
                                        <View style={styles.priceContainer}>
                                            <Text style={styles.priceText}>
                                                ${apt.service?.estimated_price?.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.cardBody}>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="construct-outline" size={18} color={THEME.primary} />
                                        <Text style={styles.infoText}>{apt.service?.name || 'Servicio General'}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="time-outline" size={18} color={THEME.textLight} />
                                        <Text style={styles.infoText}>
                                            {new Date(apt.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </Text>
                                    </View>

                                    {/* Timeline Visual (The Cool Part) */}
                                    <View style={styles.timelineContainer}>
                                        <TimelineDot label="Agendado" active={true} />
                                        <View style={[styles.timelineLine, { backgroundColor: apt.status !== 'scheduled' ? THEME.primary : '#E5E7EB' }]} />
                                        <TimelineDot label="Taller" active={apt.status !== 'scheduled' && apt.status !== 'confirmed'} />
                                        <View style={[styles.timelineLine, { backgroundColor: apt.status === 'completed' ? THEME.primary : '#E5E7EB' }]} />
                                        <TimelineDot label="Listo" active={apt.status === 'completed'} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity style={styles.fab} onPress={() => router.push('/schedule-appointment')}>
                            <Ionicons name="add" size={30} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function TabButton({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) {
    return (
        <TouchableOpacity style={[styles.tab, active && styles.activeTab]} onPress={onPress}>
            <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
        </TouchableOpacity>
    );
}

function TimelineDot({ label, active }: { label: string, active: boolean }) {
    return (
        <View style={styles.dotWrapper}>
            <View style={[styles.dot, active && styles.activeDot]}>
                {active && <View style={styles.dotInner} />}
            </View>
            <Text style={[styles.dotLabel, active && styles.activeDotLabel]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.background,
        paddingTop: 60,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        color: THEME.secondary,
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 8,
    },
    tab: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: THEME.border,
        backgroundColor: 'white',
    },
    activeTab: {
        backgroundColor: '#EFF6FF',
        borderColor: THEME.primary,
    },
    tabText: {
        color: THEME.textLight,
        fontSize: 12,
        fontWeight: '600',
    },
    activeTabText: {
        color: THEME.primary,
        fontWeight: 'bold',
    },
    scrollContent: {
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        paddingBottom: 100,
    },
    illustrationContainer: {
        marginBottom: 30,
        alignItems: 'center',
        justifyContent: 'center',
        width: 120,
        height: 120,
        backgroundColor: '#EFF6FF',
        borderRadius: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: THEME.text,
        textAlign: 'center',
        marginBottom: 10,
    },
    emptySubtitle: {
        fontSize: 16,
        color: THEME.textLight,
        textAlign: 'center',
        marginBottom: 30,
    },
    ctaButton: {
        backgroundColor: THEME.primary,
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        elevation: 4,
    },
    ctaButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    list: {
        padding: 20,
        gap: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: THEME.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        paddingBottom: 12,
    },
    vehicleInfo: {
        flex: 1,
    },
    carText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: THEME.text,
    },
    plateText: {
        fontSize: 14,
        color: THEME.textLight,
        textTransform: 'uppercase',
    },
    headerRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    priceContainer: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    priceText: {
        fontSize: 15,
        fontWeight: '800',
        color: THEME.secondary,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardBody: {
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    infoText: {
        fontSize: 15,
        color: THEME.text,
    },
    timelineContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        paddingHorizontal: 10,
    },
    timelineLine: {
        flex: 1,
        height: 2,
        backgroundColor: '#E5E7EB',
        marginTop: -16,
    },
    dotWrapper: {
        alignItems: 'center',
        width: 60,
    },
    dot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        marginBottom: 6,
    },
    activeDot: {
        backgroundColor: THEME.primary,
        width: 18,
        height: 18,
        borderRadius: 9,
    },
    dotInner: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'white',
    },
    dotLabel: {
        fontSize: 10,
        color: THEME.textLight,
        fontWeight: '600',
    },
    activeDotLabel: {
        color: THEME.primary,
        fontWeight: 'bold',
    },
    fab: {
        position: 'absolute',
        bottom: 20, // Relative to the list view or could be fixed screen
        right: 0,
        backgroundColor: THEME.primary,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    }
});
