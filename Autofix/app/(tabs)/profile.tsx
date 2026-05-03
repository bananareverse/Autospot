import { useAuth } from '@/ctx/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

import { useAppTheme } from '@/hooks/useAppTheme';

export default function ProfileScreen() {
    const theme = useAppTheme();
    const styles = getStyles(theme);

    const router = useRouter();
    const { isWorkshop } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [workshopServices, setWorkshopServices] = useState<any[]>([]);
    const [workshopData, setWorkshopData] = useState<any>(null);

    // States for Workshop Hours
    const [showOpeningPicker, setShowOpeningPicker] = useState(false);
    const [showClosingPicker, setShowClosingPicker] = useState(false);
    const [tempOpening, setTempOpening] = useState(new Date());
    const [tempClosing, setTempClosing] = useState(new Date());
    const [updatingHours, setUpdatingHours] = useState(false);


    const cambiarFotoPerfil = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
                base64: true,
            });
            if (result.canceled) return;

            const imagen = result.assets[0];
            if (!imagen.base64) return;

            const formData = new FormData();
            formData.append('file', {
                uri: imagen.uri,
                name: `avatar_${profile.email}.jpg`,
                type: 'image/jpeg',
            } as any);

            Alert.alert("Subiendo...", "Tu foto se esta guardando");
            const { data, error } = await supabase.storage.from('Avatar')
                .upload(`avatar_${profile.email}.jpg`, formData, {
                    upsert: true,
                });
            if (error) {
                Alert.alert("Error", error.message);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from('Avatar')
                .getPublicUrl(`avatar_${profile.email}.jpg`);

            setProfile({ ...profile, avatar: publicUrlData.publicUrl });
        } catch (error) {
            console.log("Error subiendo foto:", error);
            Alert.alert("Error", "No se pudo subir la foto");
        }
    }

    useEffect(() => {
        getProfile();
    }, []);

    async function getProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setProfile({
                    fullName: user.user_metadata?.full_name || 'Usuario',
                    email: user.email,
                    avatar: user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?background=219ebc&color=fff&size=200'
                });

                if (isWorkshop) {
                    const { data: workshop } = await supabase
                        .from('workshops')
                        .select('*, workshop_staff!inner(*)')
                        .eq('workshop_staff.user_id', user.id)
                        .single();

                    if (workshop) {
                        setWorkshopData(workshop);
                        const { data: services } = await supabase
                            .from('workshop_services')
                            .select('custom_price, service:service_catalog(name)')
                            .eq('workshop_id', workshop.id)
                            .limit(3);
                        setWorkshopServices(services || []);
                    }
                }
            }
        } catch (e) {
            console.log('Error loading profile', e);
        } finally {
            setLoading(false);
        }
    }

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert('Error', error.message);
    };

    const handleSaveHours = async (type: 'open' | 'close', selectedTime: Date) => {
        if (!workshopData) return;

        setUpdatingHours(true);
        const timeStr = selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const field = type === 'open' ? 'opening_time' : 'closing_time';

        try {
            const { error } = await supabase
                .from('workshops')
                .update({ [field]: timeStr })
                .eq('id', workshopData.id);

            if (error) throw error;

            setWorkshopData({ ...workshopData, [field]: timeStr });
            if (Platform.OS === 'android') {
                import('react-native').then(({ ToastAndroid }) => {
                    ToastAndroid.show('Horario actualizado', ToastAndroid.SHORT);
                });
            }
        } catch (e: any) {
            Alert.alert('Error', 'No se pudo actualizar el horario: ' + e.message);
        } finally {
            setUpdatingHours(false);
            setShowOpeningPicker(false);
            setShowClosingPicker(false);
        }
    };


    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Gradient Background for Top Section */}
            <LinearGradient
                colors={[theme.secondary, theme.primary]}
                style={styles.headerGradient}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <View style={styles.header}>
                    <Text style={styles.title}>Mi Perfil</Text>
                </View>

                {/* Profile Card Floating over Gradient */}
                <View style={styles.profileCard}>
                    <View style={styles.avatarWrapper}>
                        <TouchableOpacity onPress={cambiarFotoPerfil}>
                            <Image
                                source={{ uri: profile?.avatar }}
                                style={styles.avatar}
                            />
                        </TouchableOpacity>
                        <View style={styles.verifiedBadge}>
                            <Ionicons name={isWorkshop ? "shield-checkmark" : "star"} size={16} color="white" />
                        </View>
                    </View>
                    <Text style={styles.userName}>{isWorkshop ? (workshopData?.name || profile?.fullName) : profile?.fullName}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.userRole}>{isWorkshop ? 'Taller Afiliado' : 'Cliente'}</Text>
                    </View>
                </View>

                {/* Options List */}
                <View style={styles.actionsContainer}>
                    <Text style={styles.sectionTitle}>Cuenta</Text>

                    <View style={styles.linksGroup}>
                        {!isWorkshop && (
                            <LinkRow
                                icon="car-sport"
                                title="Mis Vehículos"
                                subtitle="Administra tus autos registrados"
                                onPress={() => router.push('/my-vehicles')}
                                isFirst
                            />
                        )}

                        <LinkRow
                            icon={isWorkshop ? "business" : "person"}
                            title={isWorkshop ? "Administrar Taller" : "Mi Información"}
                            subtitle={isWorkshop ? "Gestionar servicios y citas" : "Dirección, horarios y contacto"}
                            onPress={() => router.push(isWorkshop ? '/workshop-admin' : '/client-info')}
                            isFirst={isWorkshop}
                            isLast={!isWorkshop}
                        />

                        {isWorkshop && (
                            <LinkRow
                                icon="people"
                                title="Administrar Personal"
                                subtitle="Gestiona tu equipo de mecánicos"
                                onPress={() => router.push('/manage-mechanics')}
                                isLast
                            />
                        )}
                    </View>

                    {isWorkshop ? (
                        <>
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Tus Servicios Destacados</Text>

                                <View style={styles.servicesListCard}>
                                    {workshopServices.length === 0 ? (
                                        <View style={styles.emptyServices}>
                                            <Ionicons name="construct-outline" size={32} color={theme.border} />
                                            <Text style={styles.emptyServicesText}>Aún no has agregado servicios.</Text>
                                        </View>
                                    ) : (
                                        workshopServices.map((s, idx) => (
                                            <View key={idx} style={[styles.serviceRow, idx === workshopServices.length - 1 && { borderBottomWidth: 0 }]}>
                                                <View style={styles.serviceRowLeft}>
                                                    <View style={styles.serviceIconBg}>
                                                        <Ionicons name="construct" size={16} color={theme.primary} />
                                                    </View>
                                                    <Text style={styles.serviceNameText}>{s.service?.name}</Text>
                                                </View>
                                                <Text style={styles.servicePriceText}>${s.custom_price || 0}</Text>
                                            </View>
                                        ))
                                    )}

                                    <TouchableOpacity
                                        style={styles.manageButton}
                                        onPress={() => router.push('/(tabs)/agenda')}
                                    >
                                        <Text style={styles.manageButtonText}>Gestionar Inventario</Text>
                                        <Ionicons name="arrow-forward" size={16} color={theme.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.section}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionTitle}>Horario de Atención</Text>
                                    {updatingHours && <ActivityIndicator size="small" color={theme.primary} />}
                                </View>

                                <View style={styles.hoursCard}>
                                    <TouchableOpacity
                                        style={styles.hourAction}
                                        onPress={() => {
                                            const [h, m] = (workshopData?.opening_time || '09:00').split(':');
                                            const d = new Date(); d.setHours(parseInt(h), parseInt(m));
                                            setTempOpening(d);
                                            setShowOpeningPicker(true);
                                        }}
                                    >
                                        <View style={styles.hourInfo}>
                                            <Ionicons name="time-outline" size={20} color={theme.primary} />
                                            <Text style={styles.hourLabel}>Apertura:</Text>
                                        </View>
                                        <Text style={styles.hourValue}>{workshopData?.opening_time?.slice(0, 5) || '09:00'}</Text>
                                        <Ionicons name="pencil" size={14} color={theme.textMuted} />
                                    </TouchableOpacity>

                                    <View style={styles.hourDivider} />

                                    <TouchableOpacity
                                        style={styles.hourAction}
                                        onPress={() => {
                                            const [h, m] = (workshopData?.closing_time || '18:00').split(':');
                                            const d = new Date(); d.setHours(parseInt(h), parseInt(m));
                                            setTempClosing(d);
                                            setShowClosingPicker(true);
                                        }}
                                    >
                                        <View style={styles.hourInfo}>
                                            <Ionicons name="moon-outline" size={20} color={theme.accent} />
                                            <Text style={styles.hourLabel}>Cierre:</Text>
                                        </View>
                                        <Text style={styles.hourValue}>{workshopData?.closing_time?.slice(0, 5) || '18:00'}</Text>
                                        <Ionicons name="pencil" size={14} color={theme.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    ) : null}

                    {/* Show pickers */}
                    {showOpeningPicker && (
                        <DateTimePicker
                            value={tempOpening}
                            mode="time"
                            is24Hour={true}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, date) => {
                                if (Platform.OS === 'android') {
                                    setShowOpeningPicker(false);
                                    if (event.type === 'set' && date) handleSaveHours('open', date);
                                } else if (date) {
                                    setTempOpening(date);
                                }
                            }}
                        />
                    )}

                    {showClosingPicker && (
                        <DateTimePicker
                            value={tempClosing}
                            mode="time"
                            is24Hour={true}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, date) => {
                                if (Platform.OS === 'android') {
                                    setShowClosingPicker(false);
                                    if (event.type === 'set' && date) handleSaveHours('close', date);
                                } else if (date) {
                                    setTempClosing(date);
                                }
                            }}
                        />
                    )}

                    {/* Logout Button */}
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={24} color={theme.danger} />
                        <Text style={styles.logoutText}>Cerrar Sesión</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

function LinkRow({ icon, title, subtitle, onPress, isFirst, isLast }: { icon: any, title: string, subtitle: string, onPress?: () => void, isFirst?: boolean, isLast?: boolean }) {
    const theme = useAppTheme();
    const styles = getStyles(theme);
    return (
        <TouchableOpacity
            style={[
                styles.linkRow,
                isFirst && styles.linkRowFirst,
                isLast && styles.linkRowLast,
                !isLast && styles.linkRowBorder
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.iconBox}>
                <Ionicons name={icon} size={22} color={theme.primary} />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.actionText}>{title}</Text>
                <Text style={styles.actionSubtext}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.border} />
        </TouchableOpacity>
    );
}

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg,
    },
    headerGradient: {
        height: 250,
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
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        marginBottom: 20,
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        color: 'white',
        letterSpacing: 1,
    },

    profileCard: {
        backgroundColor: theme.card,
        marginHorizontal: 24,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 8,
        shadowColor: theme.secondary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        marginBottom: 30,
        marginTop: 10,
        borderWidth: 1,
        borderColor: theme.border,
    },
    avatarWrapper: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 4,
        borderColor: theme.card,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        marginBottom: 16,
        backgroundColor: theme.bg,
        position: 'relative',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 55,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: theme.card,
    },
    userName: {
        fontSize: 22,
        fontWeight: '900',
        color: theme.secondary,
        textAlign: 'center',
    },
    roleBadge: {
        backgroundColor: 'rgba(33, 158, 188, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 10,
    },
    userRole: {
        fontSize: 13,
        color: theme.primary,
        fontWeight: 'bold',
        textAlign: 'center',
        letterSpacing: 1,
    },
    actionsContainer: {
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: theme.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginLeft: 8,
    },
    linksGroup: {
        backgroundColor: theme.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: theme.border,
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        backgroundColor: theme.card,
    },
    linkRowFirst: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    linkRowLast: {
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    linkRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: theme.bg,
        borderWidth: 1,
        borderColor: theme.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    hoursCard: {
        backgroundColor: theme.card,
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: theme.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    hourAction: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        justifyContent: 'space-between',
    },
    hourInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    hourLabel: {
        fontSize: 15,
        color: theme.text,
        fontWeight: '500',
    },
    hourValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.secondary,
        marginRight: 12,
    },
    hourDivider: {
        height: 1,
        backgroundColor: theme.border,
        marginHorizontal: 16,
    },
    iosPickerContainer: {
        backgroundColor: theme.card,
        marginTop: 8,
        borderRadius: 12,
        overflow: 'hidden',
    },
    iosPickerDone: {
        padding: 12,
        alignItems: 'flex-end',
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    iosPickerDoneText: {
        color: theme.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    actionText: {
        color: theme.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    actionSubtext: {
        color: theme.textMuted,
        fontSize: 12,
        lineHeight: 16,
    },
    section: {
        marginBottom: 30,
    },
    servicesListCard: {
        backgroundColor: theme.card,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: theme.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    emptyServices: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    emptyServicesText: {
        color: theme.textMuted,
        textAlign: 'center',
        marginTop: 10,
        fontWeight: '500',
    },
    serviceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
    },
    serviceRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    serviceIconBg: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(33, 158, 188, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    serviceNameText: {
        fontSize: 15,
        color: theme.text,
        fontWeight: 'bold',
        flex: 1,
    },
    servicePriceText: {
        fontSize: 16,
        color: theme.secondary,
        fontWeight: '900',
    },
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        gap: 8,
        backgroundColor: 'rgba(33, 158, 188, 0.1)',
        paddingVertical: 12,
        borderRadius: 12,
    },
    manageButtonText: {
        color: theme.primary,
        fontWeight: '900',
        fontSize: 14,
    },
    emptyCard: {
        backgroundColor: theme.card,
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    emptyCardIconBox: {
        width: 60,
        height: 60,
        borderRadius: 20,
        backgroundColor: 'rgba(33, 158, 188, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyCardTitle: {
        color: theme.secondary,
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyCardText: {
        color: theme.textMuted,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    searchButton: {
        flexDirection: 'row',
        backgroundColor: theme.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    searchButtonText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 14,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        marginTop: 10,
        gap: 10,
    },
    logoutText: {
        color: theme.danger,
        fontWeight: 'bold',
        fontSize: 16,
    }
});

