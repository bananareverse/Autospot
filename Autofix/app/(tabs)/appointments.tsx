import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback } from 'react';
import { getUserAppointments, Appointment } from '@/lib/appointments';
import { useRouter } from 'expo-router';

import { useAppTheme } from '@/hooks/useAppTheme';

type TabType = 'programadas' | 'realizadas' | 'canceladas';

export default function AppointmentsScreen() {
    const theme = useAppTheme();
    const styles = getStyles(theme);

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
                <ActivityIndicator color={theme.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <Text style={styles.title}>Citas</Text>
                <TouchableOpacity 
                    style={styles.headerAddButton} 
                    onPress={() => router.push('/schedule-appointment')}
                >
                    <Ionicons name="add" size={26} color="white" />
                </TouchableOpacity>
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
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            >
                {filteredAppointments.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <View style={styles.illustrationContainer}>
                            <Ionicons name="calendar-outline" size={80} color={theme.primary} style={{ opacity: 0.8 }} />
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
                                    pathname: '/client-appointment-details',
                                    params: { appointmentId: apt.id }
                                })}
                            >
                                <View style={styles.cardHeader}>
                                    <View style={styles.vehicleInfo}>
                                        <Text style={styles.carText}>{apt.vehicle?.make} {apt.vehicle?.model}</Text>
                                        <Text style={styles.plateText}>{apt.vehicle?.license_plate}</Text>
                                    </View>
                                    <View style={styles.headerRight}>
                                        <View style={[styles.statusBadge, { backgroundColor: theme.status[apt.status] + '15' }]}>
                                            <Text style={[styles.statusText, { color: theme.status[apt.status] }]}>
                                                {apt.status === 'scheduled' ? 'Programada' :
                                                    apt.status === 'confirmed' ? 'Confirmada' :
                                                        apt.status === 'completed' ? 'Realizada' : 'Cancelada'}
                                            </Text>
                                        </View>
                                        <View style={styles.priceContainer}>
                                            <Text style={styles.priceText}>
                                                ${apt.final_price != null ? apt.final_price.toLocaleString('es-MX', { minimumFractionDigits: 0 }) : 'N/A'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.cardBody}>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="construct-outline" size={18} color={theme.primary} />
                                        <Text style={styles.infoText}>{apt.service?.name || 'Servicio General'}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Ionicons name="time-outline" size={18} color={theme.textSoft} />
                                        <Text style={styles.infoText}>
                                            {new Date(apt.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </Text>
                                    </View>

                                    {/* Timeline Visual (The Cool Part) */}
                                    {apt.status === 'cancelled' ? (
                                        <View style={[styles.timelineContainer, { flexDirection: 'row', justifyContent: 'center', backgroundColor: theme.danger + '15', padding: 12, borderRadius: 12 }]}>
                                            <Ionicons name="close-circle" size={20} color={theme.status.cancelled} style={{ marginRight: 8 }} />
                                            <Text style={{ color: theme.status.cancelled, fontWeight: '700' }}>Cita Cancelada</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.timelineContainer}>
                                            <TimelineDot label="Agendado" active={true} />
                                            <View style={[styles.timelineLine, { backgroundColor: apt.status === 'confirmed' || apt.status === 'completed' ? theme.primary : theme.border }]} />
                                            <TimelineDot label="Aceptado" active={apt.status === 'confirmed' || apt.status === 'completed'} />
                                            <View style={[styles.timelineLine, { backgroundColor: apt.status === 'completed' ? theme.primary : theme.border }]} />
                                            <TimelineDot label="Listo" active={apt.status === 'completed'} />
                                        </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}

                    </View>
                )}
            </ScrollView>
        </View>
    );
}

function TabButton({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) {
    const theme = useAppTheme();
    const styles = getStyles(theme);
    return (
        <TouchableOpacity style={[styles.tab, active && styles.activeTab]} onPress={onPress}>
            <Text style={[styles.tabText, active && styles.activeTabText]}>{label}</Text>
        </TouchableOpacity>
    );
}

function TimelineDot({ label, active }: { label: string, active: boolean }) {
    const theme = useAppTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.dotWrapper}>
            <View style={[styles.dot, active && styles.activeDot]}>
                {active && <View style={styles.dotInner} />}
            </View>
            <Text style={[styles.dotLabel, active && styles.activeDotLabel]}>{label}</Text>
        </View>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
        paddingTop: 60,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    headerAddButton: {
        backgroundColor: theme.primary,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        color: theme.secondary,
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
        borderColor: theme.border,
        backgroundColor: theme.card,
    },
    activeTab: {
        backgroundColor: theme.primary + '15',
        borderColor: theme.primary,
    },
    tabText: {
        color: theme.textSoft,
        fontSize: 12,
        fontWeight: '600',
    },
    activeTabText: {
        color: theme.primary,
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
        backgroundColor: theme.bg,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.text,
        textAlign: 'center',
        marginBottom: 10,
    },
    emptySubtitle: {
        fontSize: 16,
        color: theme.textSoft,
        textAlign: 'center',
        marginBottom: 30,
    },
    ctaButton: {
        backgroundColor: theme.primary,
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
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.border,
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
        borderBottomColor: theme.border,
        paddingBottom: 12,
    },
    vehicleInfo: {
        flex: 1,
    },
    carText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.text,
    },
    plateText: {
        fontSize: 14,
        color: theme.textSoft,
        textTransform: 'uppercase',
    },
    headerRight: {
        alignItems: 'flex-end',
        gap: 6,
    },
    priceContainer: {
        backgroundColor: theme.bg,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    priceText: {
        fontSize: 15,
        fontWeight: '800',
        color: theme.secondary,
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
        color: theme.text,
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
        backgroundColor: theme.border,
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
        backgroundColor: theme.border,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        marginBottom: 6,
    },
    activeDot: {
        backgroundColor: theme.primary,
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
        color: theme.textSoft,
        fontWeight: '600',
    },
    activeDotLabel: {
        color: theme.primary,
        fontWeight: 'bold',
    }
});
