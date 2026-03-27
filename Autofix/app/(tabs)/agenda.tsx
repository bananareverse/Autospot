import { useAuth } from '@/ctx/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

const THEME = {
    primary: '#219ebc',
    secondary: '#023047',
    accent: '#fb8500',
    bg: '#F8FAFC',
    card: '#FFFFFF',
    text: '#1e293b',
    textMuted: '#64748b',
    border: '#e2e8f0',
};

const STATUS_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
    scheduled: { label: 'Programada', color: '#3b82f6', icon: 'calendar-outline' },
    confirmed: { label: 'Confirmada', color: '#10b981', icon: 'checkmark-circle-outline' },
    in_progress: { label: 'En Proceso', color: '#8b5cf6', icon: 'hammer-outline' },
    ready: { label: 'Lista', color: '#f59e0b', icon: 'star-outline' },
    completed: { label: 'Completada', color: '#64728b', icon: 'checkmark-done' },
    cancelled: { label: 'Cancelada', color: '#ef4444', icon: 'close-circle-outline' },
};

interface AppointmentWithDetails {
    id: string;
    scheduled_at: string;
    status: string;
    notes: string | null;
    client: { first_name: string; last_name: string; phone?: string } | null;
    vehicle: { make: string; model: string; license_plate: string } | null;
    service: { name: string; estimated_price: number } | null;
    final_price?: number;
}

export default function AgendaScreen() {
    const { isWorkshop } = useAuth();
    const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const router = useRouter();

    useEffect(() => {
        if (isWorkshop === true) {
            fetchAppointments();
        }
    }, [isWorkshop]);

    async function fetchAppointments() {
        try {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();

            if (!user?.id) {
                setAppointments([]);
                return;
            }

            const { data: staffData } = await supabase
                .from('workshop_staff')
                .select('workshop_id')
                .eq('user_id', user.id)
                .single();

            if (!staffData) {
                setAppointments([]);
                return;
            }

            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    id, scheduled_at, status, notes,
                    client:clients(first_name, last_name, phone),
                    vehicle:vehicles(make, model, license_plate),
                    service:service_catalog(name, estimated_price),
                    workshop_id, service_id
                `)
                .eq('workshop_id', staffData.workshop_id)
                .order('scheduled_at', { ascending: true });

            if (error) {
                console.error("Fetch appointments error:", error);
                setAppointments([]);
            } else {
                // Enrich data with custom prices if exists
                const enrichedData = await Promise.all((data || []).map(async (apt: any) => {
                    let price = apt.service?.estimated_price || 0;
                    if (apt.workshop_id && apt.service_id) {
                        const { data: ws } = await supabase
                            .from('workshop_services')
                            .select('custom_price')
                            .eq('workshop_id', apt.workshop_id)
                            .eq('service_id', apt.service_id)
                            .maybeSingle();
                        if (ws?.custom_price) price = ws.custom_price;
                    }
                    return { ...apt, final_price: price };
                }));
                setAppointments(enrichedData);
            }
        } catch (e) {
            console.error("Agenda screen crash:", e);
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    }

    // Redirect if not a workshop
    useEffect(() => {
        if (isWorkshop === false) {
            router.replace('/');
        }
    }, [isWorkshop]);

    const dailyAppointments = useMemo(() => {
        const dateStr = selectedDate.toISOString().split('T')[0];
        return appointments.filter(a => a.scheduled_at.startsWith(dateStr));
    }, [appointments, selectedDate]);

    const weekDays = useMemo(() => {
        const days = [];
        const start = new Date(selectedDate);
        start.setDate(selectedDate.getDate() - 3);
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    }, [selectedDate]);

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color={THEME.primary} />
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header Section */}
            <LinearGradient
                colors={[THEME.secondary, THEME.primary]}
                style={styles.header}
            >
                <View style={styles.headerTop}>
                    <Text style={styles.screenTitle}>Agenda</Text>
                    <TouchableOpacity onPress={fetchAppointments}>
                        <Ionicons name="refresh" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={styles.dateDisplay}>
                    <Text style={styles.dayBig}>{selectedDate.getDate()}</Text>
                    <View>
                        <Text style={styles.monthLabel}>{selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}</Text>
                        <Text style={styles.weekdayLabel}>{selectedDate.toLocaleDateString('es-ES', { weekday: 'long' })}</Text>
                    </View>
                </View>

                {/* Day selector Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPillsContainer}>
                    {weekDays.map((d, i) => {
                        const active = d.toDateString() === selectedDate.toDateString();
                        const isToday = d.toDateString() === new Date().toDateString();
                        return (
                            <TouchableOpacity
                                key={i}
                                style={[styles.dayPill, active && styles.dayPillActive]}
                                onPress={() => setSelectedDate(d)}
                            >
                                <Text style={[styles.dayPillName, active && styles.dayPillTextActive]}>
                                    {d.toLocaleDateString('es-ES', { weekday: 'short' })}
                                </Text>
                                <Text style={[styles.dayPillNum, active && styles.dayPillTextActive]}>
                                    {d.getDate()}
                                </Text>
                                {isToday && !active && <View style={styles.todayDot} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </LinearGradient>

            <View style={styles.body}>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>CITAS DEL DÍA</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{dailyAppointments.length}</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    {dailyAppointments.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconBox}>
                                <Ionicons name="calendar-outline" size={48} color={THEME.border} />
                            </View>
                            <Text style={styles.emptyText}>No hay citas para hoy</Text>
                            <Text style={styles.emptySub}>Disfruta de tu tiempo libre o revisa otros días.</Text>
                        </View>
                    ) : (
                        dailyAppointments.map((apt) => {
                            const conf = STATUS_CONFIG[apt.status] || STATUS_CONFIG.scheduled;
                            return (
                                <TouchableOpacity
                                    key={apt.id}
                                    style={styles.aptCard}
                                    onPress={() => router.push({ pathname: '/workshop-appointment-details', params: { appointmentId: apt.id } })}
                                >
                                    <View style={[styles.statusSideBar, { backgroundColor: conf.color }]} />

                                    <View style={styles.aptTimeColumn}>
                                        <Text style={styles.aptHour}>{new Date(apt.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                        <Text style={styles.aptDuration}>---</Text>
                                    </View>

                                    <View style={styles.aptMainInfo}>
                                        <Text style={styles.clientName}>{apt.client?.first_name} {apt.client?.last_name || 'Cliente'}</Text>
                                        <Text style={styles.vehicleInfo} numberOfLines={1}>{apt.vehicle?.make} {apt.vehicle?.model} • <Text style={{ color: THEME.primary }}>{apt.vehicle?.license_plate}</Text></Text>
                                        <View style={styles.serviceTag}>
                                            <Ionicons name="construct-outline" size={12} color={THEME.textMuted} />
                                            <Text style={styles.serviceText}>{apt.service?.name}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.aptEndColumn}>
                                        <View style={[styles.statusIconBox, { backgroundColor: conf.color + '15' }]}>
                                            <Ionicons name={conf.icon} size={18} color={conf.color} />
                                        </View>
                                        <Text style={styles.aptPrice}>${apt.final_price?.toLocaleString()}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: THEME.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 50 },
    screenTitle: { color: 'white', fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },

    dateDisplay: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginTop: 20, gap: 12 },
    dayBig: { fontSize: 48, fontWeight: '900', color: 'white' },
    monthLabel: { fontSize: 13, fontWeight: 'bold', color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
    weekdayLabel: { fontSize: 16, fontWeight: 'bold', color: 'white', textTransform: 'capitalize' },

    dayPillsContainer: { paddingHorizontal: 20, marginTop: 24, gap: 10 },
    dayPill: { width: 55, height: 75, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    dayPillActive: { backgroundColor: THEME.accent },
    dayPillName: { fontSize: 11, fontWeight: 'bold', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' },
    dayPillNum: { fontSize: 18, fontWeight: '900', color: 'white', marginTop: 2 },
    dayPillTextActive: { color: 'white' },
    todayDot: { position: 'absolute', bottom: 8, width: 4, height: 4, borderRadius: 2, backgroundColor: THEME.accent },

    body: { flex: 1, paddingHorizontal: 20, marginTop: 20 },
    listHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    listTitle: { fontSize: 13, fontWeight: '900', color: THEME.textMuted, letterSpacing: 1 },
    badge: { backgroundColor: THEME.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

    listContent: { paddingBottom: 30 },
    aptCard: {
        backgroundColor: THEME.card, borderRadius: 20, marginBottom: 12,
        flexDirection: 'row', overflow: 'hidden', elevation: 3,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }
    },
    statusSideBar: { width: 6, height: '100%' },
    aptTimeColumn: { padding: 15, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: THEME.border, width: 75 },
    aptHour: { fontSize: 15, fontWeight: '900', color: THEME.secondary },
    aptDuration: { fontSize: 10, color: THEME.textMuted, marginTop: 2 },

    aptMainInfo: { flex: 1, padding: 15, justifyContent: 'center' },
    clientName: { fontSize: 16, fontWeight: 'bold', color: THEME.text },
    vehicleInfo: { fontSize: 13, color: THEME.textMuted, marginTop: 2 },
    serviceTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    serviceText: { fontSize: 12, fontWeight: 'bold', color: THEME.textMuted },

    aptEndColumn: { padding: 15, alignItems: 'center', justifyContent: 'space-between' },
    statusIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    aptPrice: { fontSize: 14, fontWeight: '900', color: THEME.secondary },

    emptyState: { paddingVertical: 60, alignItems: 'center' },
    emptyIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyText: { fontSize: 18, fontWeight: 'bold', color: THEME.secondary },
    emptySub: { fontSize: 14, color: THEME.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: 40 }
});