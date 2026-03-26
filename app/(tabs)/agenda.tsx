import { useAuth } from '@/ctx/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface Vehicle {
    id: string;
    make: string;
    model: string;
    license_plate: string;
}

interface Service {
    id: string;
    name: string;
    estimated_price: number;
}

interface AppointmentWithDetails {
    id: string;
    scheduled_at: string;
    status: string;
    notes: string | null;
    client_id: string;
    vehicle_id: string;
    workshop_id: string | null;
    service_id: string | null;
    created_at: string;
    vehicle?: Vehicle;
    service?: Service;
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
                console.log("No user found");
                setAppointments([]);
                return;
            }

            console.log("User ID:", user.id);

            // Get workshop ID associated with this user
            const { data: workshopStaff, error: staffError } = await supabase
                .from('workshop_staff')
                .select('workshop_id')
                .eq('user_id', user.id)
                .single();

            if (staffError || !workshopStaff) {
                console.log("No workshop found for user:", staffError);
                setAppointments([]);
                return;
            }

            console.log("Workshop ID:", workshopStaff.workshop_id);

            // Get appointments for this workshop with vehicle and service details
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    vehicle:vehicles(id, make, model, license_plate),
                    service:service_catalog(id, name, estimated_price)
                `)
                .eq('workshop_id', workshopStaff.workshop_id)
                .order('scheduled_at', { ascending: true });

            if (error) {
                console.log("ERROR fetching appointments:", error);
                setAppointments([]);
            } else {
                console.log("Total appointments fetched:", (data || []).length);
                if (data && data.length > 0) {
                    data.forEach((apt) => {
                        console.log(`Cita: ID=${apt.id}, Fecha=${apt.scheduled_at}, Status=${apt.status}`);
                    });
                } else {
                    console.log("No appointments found for workshop:", workshopStaff.workshop_id);
                }
                setAppointments(data || []);
            }

        } catch (e) {
            console.log("ERROR GENERAL:", e);
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    }

    // Bloquear usuario cliente
    useEffect(() => {
        if (isWorkshop === false) {
            router.replace('/');
        }
    }, [isWorkshop]);

    const handleAppointmentPress = (appointment: AppointmentWithDetails) => {
        router.push({
            pathname: '/appointment-details',
            params: {
                appointmentId: appointment.id,
            },
        });
    };

    const navigateDay = (direction: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + direction);
        setSelectedDate(newDate);
    };

    const getAppointmentsForSelectedDate = (): AppointmentWithDetails[] => {
        const selectedDateStr = selectedDate.toISOString().split('T')[0];
        return appointments
            .filter((apt) => apt.scheduled_at.split('T')[0] === selectedDateStr)
            .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
    };

    const generateWeekDays = () => {
        const days = [];
        const today = new Date();
        for (let i = -3; i <= 3; i++) {
            const day = new Date(today);
            day.setDate(today.getDate() + i);
            days.push(day);
        }
        return days;
    };

    const getStatusColor = (status: string): string => {
        switch (status.toLowerCase()) {
            case 'scheduled':
                return '#0078d4'; // Azul
            case 'confirmed':
                return '#10B981'; // Verde
            case 'completed':
                return '#6B7280'; // Gris
            case 'cancelled':
                return '#EF4444'; // Rojo
            default:
                return '#6B7280'; // Gris por defecto
        }
    };

    if (isWorkshop === undefined) {
        return <ActivityIndicator style={{ marginTop: 50 }} />;
    }

    if (isWorkshop === false) {
        return null;
    }

    if (loading) {
        return <ActivityIndicator style={{ marginTop: 50 }} />;
    }

    const selectedDateAppointments = getAppointmentsForSelectedDate();
    const weekDays = generateWeekDays();

    return (
        <View style={styles.container}>
            {/* Header with Date */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigateDay(-1)} style={styles.navButton}>
                    <Text style={styles.navButtonText}>←</Text>
                </TouchableOpacity>
                <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>
                        {selectedDate.toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </Text>
                    <Text style={styles.appointmentCount}>
                        {selectedDateAppointments.length} cita{selectedDateAppointments.length !== 1 ? 's' : ''}
                    </Text>
                </View>
                <TouchableOpacity onPress={() => navigateDay(1)} style={styles.navButton}>
                    <Text style={styles.navButtonText}>→</Text>
                </TouchableOpacity>
            </View>

            {/* Day Selector Bar */}
            <View style={styles.daySelector}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daySelectorContent}>
                    {weekDays.map((day, index) => {
                        const isSelected = day.toDateString() === selectedDate.toDateString();
                        const isToday = isDateToday(day);
                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={() => setSelectedDate(day)}
                                style={[styles.dayButton, isSelected && styles.selectedDayButton]}
                            >
                                <Text style={[styles.dayButtonName, isSelected && styles.selectedDayText, isToday && !isSelected && styles.todayText]}>
                                    {day.toLocaleDateString('es-ES', { weekday: 'short' })}
                                </Text>
                                <Text style={[styles.dayButtonNumber, isSelected && styles.selectedDayText, isToday && !isSelected && styles.todayText]}>
                                    {day.getDate()}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Appointments List */}
            <ScrollView style={styles.appointmentsList} showsVerticalScrollIndicator={false}>
                {selectedDateAppointments.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No hay citas programadas para este día</Text>
                        <Text style={styles.emptyStateSubtext}>Las citas aparecerán aquí cuando sean agendadas</Text>
                    </View>
                ) : (
                    selectedDateAppointments.map((appointment) => (
                        <TouchableOpacity
                            key={appointment.id}
                            onPress={() => handleAppointmentPress(appointment)}
                            style={styles.appointmentCard}
                        >
                            <View style={styles.appointmentTimeContainer}>
                                <Text style={styles.appointmentTime}>
                                    {new Date(appointment.scheduled_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </Text>
                                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(appointment.status) }]} />
                            </View>
                            <View style={styles.appointmentDetails}>
                                <Text style={styles.appointmentTitle}>
                                    {appointment.vehicle?.model || 'Vehículo'} - {appointment.service?.name || 'Servicio'}
                                </Text>
                                <Text style={styles.appointmentSubtitle}>
                                    {appointment.vehicle?.license_plate || 'Sin placas'}
                                </Text>
                                {appointment.notes && (
                                    <Text style={styles.appointmentNotes} numberOfLines={2}>
                                        {appointment.notes}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.appointmentArrow}>
                                <Text style={styles.arrowText}>›</Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </View>
    );
}

// Helper Functions
function isDateToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        paddingTop: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    navButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    navButtonText: {
        fontSize: 18,
        color: '#0078d4',
        fontWeight: 'bold',
    },
    dateContainer: {
        flex: 1,
        alignItems: 'center',
    },
    dateText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2d3436',
        textAlign: 'center',
    },
    appointmentCount: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    daySelector: {
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        height: 80,
    },
    daySelectorContent: {
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    dayButton: {
        width: 50,
        height: 60,
        marginHorizontal: 4,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9f9f9',
    },
    selectedDayButton: {
        backgroundColor: '#0078d4',
    },
    dayButtonName: {
        fontSize: 11,
        color: '#666',
        textTransform: 'uppercase',
        fontWeight: '500',
    },
    dayButtonNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2d3436',
        marginTop: 2,
    },
    selectedDayText: {
        color: '#ffffff',
    },
    todayText: {
        color: '#0078d4',
    },
    appointmentsList: {
        flex: 1,
        padding: 16,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2d3436',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
    },
    appointmentCard: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    appointmentTimeContainer: {
        alignItems: 'center',
        marginRight: 16,
    },
    appointmentTime: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2d3436',
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 4,
    },
    appointmentDetails: {
        flex: 1,
    },
    appointmentTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d3436',
        marginBottom: 4,
    },
    appointmentSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    appointmentNotes: {
        fontSize: 13,
        color: '#888',
        lineHeight: 18,
    },
    appointmentArrow: {
        marginLeft: 8,
    },
    arrowText: {
        fontSize: 24,
        color: '#ccc',
        fontWeight: 'bold',
    },
});