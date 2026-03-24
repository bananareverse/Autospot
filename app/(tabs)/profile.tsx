import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/ctx/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const THEME = {
    background: '#FFFFFF',
    text: '#1F2937',
    textLight: '#6B7280',
    primary: '#219ebc',
    secondary: '#023047',
    border: '#E5E7EB',
    cardBg: '#FFFFFF',
    danger: '#EF4444',
};

export default function ProfileScreen() {
    const router = useRouter();
    const { isWorkshop } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [workshopServices, setWorkshopServices] = useState<any[]>([]);
    const [workshopData, setWorkshopData] = useState<any>(null);
    const [description, setDescription] = useState('');
    const [availability, setAvailability] = useState('');
    const [editingDesc, setEditingDesc] = useState(false);
    const [editingAvail, setEditingAvail] = useState(false);
    const [savingDesc, setSavingDesc] = useState(false);
    const [savingAvail, setSavingAvail] = useState(false);

    const cambiarFotoPerfil = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para cambiar la foto.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                base64: true,
            });
            if (result.canceled || !result.assets?.[0]) return;

            const imagen = result.assets[0];
            if (!imagen.base64) return;

            setUploadingPhoto(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const fileName = `${user.id}.jpg`;
            const byteArray = Uint8Array.from(atob(imagen.base64), c => c.charCodeAt(0));

            const { error: uploadError } = await supabase.storage
                .from('Avatar')
                .upload(fileName, byteArray, {
                    contentType: 'image/jpeg',
                    upsert: true,
                });

            if (uploadError) {
                Alert.alert('Error', uploadError.message);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from('Avatar')
                .getPublicUrl(fileName);

            const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

            // Persist in auth metadata and profiles table
            await Promise.all([
                supabase.auth.updateUser({ data: { avatar_url: publicUrlData.publicUrl } }),
                supabase.from('profiles').update({ avatar_url: publicUrlData.publicUrl }).eq('id', user.id),
            ]);

            setProfile((prev: any) => ({ ...prev, avatar: avatarUrl }));
            Alert.alert('¡Listo!', 'Foto de perfil actualizada.');
        } catch (error) {
            console.log('Error subiendo foto:', error);
            Alert.alert('Error', 'No se pudo subir la foto');
        } finally {
            setUploadingPhoto(false);
        }
    };

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
                    avatar: user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?background=219ebc&color=fff&size=200',
                });

                if (isWorkshop) {
                    const { data: workshop } = await supabase
                        .from('workshops')
                        .select('*, workshop_staff!inner(*)')
                        .eq('workshop_staff.user_id', user.id)
                        .single();

                    if (workshop) {
                        setWorkshopData(workshop);
                        setDescription(workshop.description || '');
                        setAvailability(workshop.opening_hours || '');
                        const { data: services } = await supabase
                            .from('workshop_services')
                            .select('custom_price, service:service_catalog(name)')
                            .eq('workshop_id', workshop.id)
                            .limit(3);
                        setWorkshopServices(services || []);
                    }
                } else {
                    const { data: profileData } = await supabase
                        .from('profiles')
                        .select('bio, availability')
                        .eq('id', user.id)
                        .single();
                    setDescription(profileData?.bio || '');
                    setAvailability(profileData?.availability || '');
                }
            }
        } catch (e) {
            console.log('Error loading profile', e);
        } finally {
            setLoading(false);
        }
    }

    async function saveDescription() {
        setSavingDesc(true);
        try {
            if (isWorkshop && workshopData) {
                const { error } = await supabase.from('workshops').update({ description }).eq('id', workshopData.id);
                if (error) throw error;
                setWorkshopData((prev: any) => ({ ...prev, description }));
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { error } = await supabase.from('profiles').update({ bio: description }).eq('id', user.id);
                if (error) throw error;
            }
            setEditingDesc(false);
        } catch (e: any) {
            Alert.alert('Error', 'No se pudo guardar la descripción.');
        } finally {
            setSavingDesc(false);
        }
    }

    async function saveAvailability() {
        setSavingAvail(true);
        try {
            if (isWorkshop && workshopData) {
                const field = 'opening_hours';
                const { error } = await supabase.from('workshops').update({ [field]: availability }).eq('id', workshopData.id);
                if (error) throw error;
                setWorkshopData((prev: any) => ({ ...prev, opening_hours: availability }));
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const { error } = await supabase.from('profiles').update({ availability }).eq('id', user.id);
                if (error) throw error;
            }
            setEditingAvail(false);
        } catch (e: any) {
            Alert.alert('Error', 'No se pudo guardar el horario.');
        } finally {
            setSavingAvail(false);
        }
    }

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert('Error', error.message);
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={THEME.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <Text style={styles.title}>Perfil</Text>
                <TouchableOpacity onPress={() => router.push('/')}>
                    <Ionicons name="settings-outline" size={24} color={THEME.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                    <TouchableOpacity onPress={cambiarFotoPerfil} disabled={uploadingPhoto}>
                        <Image
                            source={{ uri: profile?.avatar }}
                            style={styles.avatar}
                        />
                        {uploadingPhoto && (
                            <View style={styles.avatarOverlay}>
                                <ActivityIndicator color="white" />
                            </View>
                        )}
                    </TouchableOpacity>
                    <View style={styles.verifiedBadge}>
                        <Ionicons name={isWorkshop ? 'shield-checkmark' : 'star'} size={12} color="white" />
                    </View>
                    <View style={styles.cameraBadge}>
                        <Ionicons name="camera" size={12} color="white" />
                    </View>
                </View>
                <Text style={styles.userName}>{isWorkshop ? (workshopData?.name || profile?.fullName) : profile?.fullName}</Text>
                <Text style={styles.userRole}>{isWorkshop ? 'Dueño de Taller' : 'Cliente'}</Text>
            </View>

            {/* DESCRIPCIÓN */}
            <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                    <View style={styles.infoCardTitleRow}>
                        <Ionicons name="person-outline" size={16} color={THEME.primary} />
                        <Text style={styles.infoCardTitle}>Descripción</Text>
                    </View>
                    {!editingDesc ? (
                        <TouchableOpacity onPress={() => setEditingDesc(true)}>
                            <Ionicons name="pencil-outline" size={18} color={THEME.textLight} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => { setEditingDesc(false); }}
                        >
                            <Ionicons name="close-outline" size={20} color={THEME.textLight} />
                        </TouchableOpacity>
                    )}
                </View>
                {editingDesc ? (
                    <View>
                        <TextInput
                            style={styles.infoInput}
                            value={description}
                            onChangeText={setDescription}
                            placeholder={isWorkshop ? 'Describe tu taller...' : 'Cuéntanos sobre ti...'}
                            placeholderTextColor={THEME.textLight}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={saveDescription}
                            disabled={savingDesc}
                        >
                            {savingDesc ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveButtonText}>Guardar</Text>}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <Text style={[styles.infoValue, !description && styles.infoValueEmpty]}>
                        {description || (isWorkshop ? 'Sin descripción. Toca el lápiz para agregar.' : 'Sin descripción. Toca el lápiz para agregar.')}
                    </Text>
                )}
            </View>

            {/* HORARIO / DISPONIBILIDAD */}
            <View style={styles.infoCard}>
                <View style={styles.infoCardHeader}>
                    <View style={styles.infoCardTitleRow}>
                        <Ionicons name="time-outline" size={16} color={THEME.primary} />
                        <Text style={styles.infoCardTitle}>{isWorkshop ? 'Horario de Atención' : 'Disponibilidad'}</Text>
                    </View>
                    {!editingAvail ? (
                        <TouchableOpacity onPress={() => setEditingAvail(true)}>
                            <Ionicons name="pencil-outline" size={18} color={THEME.textLight} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => setEditingAvail(false)}>
                            <Ionicons name="close-outline" size={20} color={THEME.textLight} />
                        </TouchableOpacity>
                    )}
                </View>
                {editingAvail ? (
                    <View>
                        <TextInput
                            style={styles.infoInput}
                            value={availability}
                            onChangeText={setAvailability}
                            placeholder={isWorkshop ? 'Ej: Lun-Vie 9:00 AM - 6:00 PM' : 'Ej: Fines de semana'}
                            placeholderTextColor={THEME.textLight}
                        />
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={saveAvailability}
                            disabled={savingAvail}
                        >
                            {savingAvail ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.saveButtonText}>Guardar</Text>}
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.availabilityRow}>
                        <Ionicons name="calendar-outline" size={14} color={THEME.textLight} />
                        <Text style={[styles.infoValue, !availability && styles.infoValueEmpty, { flex: 1 }]}>
                            {availability || 'Sin horario. Toca el lápiz para agregar.'}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.actionsContainer}>
                {!isWorkshop && (
                    <LinkCard
                        icon="car-sport-outline"
                        title="Mis Vehículos"
                        subtitle="Administra tus autos registrados"
                        onPress={() => router.push('/my-vehicles')}
                    />
                )}

                <LinkCard
                    icon={isWorkshop ? 'construct-outline' : 'business-outline'}
                    title={isWorkshop ? 'Administrar Taller' : 'Mi Información'}
                    subtitle={isWorkshop ? 'Gestionar servicios y citas' : 'Dirección, horarios y contacto'}
                    onPress={() => router.push(isWorkshop ? '/workshop-admin' : '/client-info')}
                />

                <TouchableOpacity
                    style={[styles.actionButton, styles.logoutButton]}
                    onPress={handleLogout}
                >
                    <View style={styles.iconBoxDanger}>
                        <Ionicons name="log-out-outline" size={24} color={THEME.danger} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.actionText, { color: THEME.danger }]}>Cerrar Sesión</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={THEME.border} />
                </TouchableOpacity>
            </View>

            {isWorkshop ? (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Servicios del Taller</Text>

                    <View style={styles.servicesListCard}>
                        {workshopServices.length === 0 ? (
                            <Text style={styles.emptyServicesText}>Aún no has agregado servicios.</Text>
                        ) : (
                            workshopServices.map((s, idx) => (
                                <View key={idx} style={styles.serviceRow}>
                                    <Text style={styles.serviceNameText}>{s.service?.name}</Text>
                                    <Text style={styles.servicePriceText}>${s.custom_price || 0}</Text>
                                </View>
                            ))
                        )}

                        <TouchableOpacity
                            style={styles.manageButton}
                            onPress={() => router.push('/workshop-admin')}
                        >
                            <Text style={styles.manageButtonText}>Gestionar Todos los Servicios</Text>
                            <Ionicons name="arrow-forward" size={16} color={THEME.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Guardados</Text>

                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyCardTitle}>No has guardado nada aún</Text>
                        <Text style={styles.emptyCardText}>Las refacciones o servicios que guardes aparecerán aquí.</Text>

                        <TouchableOpacity style={styles.searchButton}>
                            <Ionicons name="search" size={18} color={THEME.primary} style={{ marginRight: 8 }} />
                            <Text style={styles.searchButtonText}>Buscar inventario</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

function LinkCard({ icon, title, subtitle, onPress }: { icon: any, title: string, subtitle: string, onPress?: () => void }) {
    return (
        <TouchableOpacity style={styles.actionButton} onPress={onPress}>
            <View style={styles.iconBox}>
                <Ionicons name={icon} size={24} color={THEME.primary} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.actionText}>{title}</Text>
                <Text style={styles.actionSubtext}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={THEME.border} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 30,
    },
    title: {
        fontSize: 34,
        fontWeight: '800',
        color: THEME.secondary,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 40,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        marginBottom: 16,
        position: 'relative',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
        backgroundColor: '#E5E7EB',
    },
    avatarOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: THEME.primary,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    cameraBadge: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        backgroundColor: THEME.secondary,
        width: 26,
        height: 26,
        borderRadius: 13,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: THEME.text,
    },
    userRole: {
        fontSize: 14,
        color: THEME.textLight,
        marginTop: 4,
        fontWeight: '500',
    },
    actionsContainer: {
        paddingHorizontal: 20,
        marginBottom: 30,
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.cardBg,
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    logoutButton: {
        marginTop: 20,
        backgroundColor: '#f0f9ff',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#e0f2fe',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    iconBoxDanger: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionText: {
        color: THEME.text,
        fontSize: 16,
        fontWeight: '600',
    },
    actionSubtext: {
        color: THEME.textLight,
        fontSize: 12,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: THEME.text,
        marginBottom: 16,
        marginLeft: 4,
    },
    emptyCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderStyle: 'dashed',
    },
    emptyCardTitle: {
        color: THEME.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyCardText: {
        color: THEME.textLight,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    searchButton: {
        flexDirection: 'row',
        backgroundColor: '#e0f2fe',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    searchButtonText: {
        color: THEME.primary,
        fontWeight: '700',
        fontSize: 14,
    },
    servicesListCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    emptyServicesText: {
        color: THEME.textLight,
        textAlign: 'center',
        marginVertical: 10,
    },
    serviceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    serviceNameText: {
        fontSize: 15,
        color: THEME.text,
        fontWeight: '500',
    },
    servicePriceText: {
        fontSize: 15,
        color: THEME.primary,
        fontWeight: 'bold',
    },
    manageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
        gap: 8,
    },
    manageButtonText: {
        color: THEME.primary,
        fontWeight: 'bold',
    },
    infoCard: {
        backgroundColor: THEME.cardBg,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    infoCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    infoCardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: THEME.textLight,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 15,
        color: THEME.text,
        lineHeight: 22,
    },
    infoValueEmpty: {
        color: THEME.textLight,
        fontStyle: 'italic',
        fontSize: 14,
    },
    infoInput: {
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: THEME.text,
        minHeight: 44,
    },
    saveButton: {
        backgroundColor: THEME.primary,
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
    },
    availabilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});