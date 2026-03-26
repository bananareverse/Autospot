import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '@/ctx/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

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
    danger: '#EF4444',
};

export default function ProfileScreen() {
    const router = useRouter();
    const { isWorkshop } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [workshopServices, setWorkshopServices] = useState<any[]>([]);
    const [workshopData, setWorkshopData] = useState<any>(null);

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

            Alert.alert("Subiendo...","Tu foto se esta guardando");
            const { data, error } = await supabase.storage.from('Avatar')
                .upload(`avatar_${profile.email}.jpg`, formData, {
                    upsert: true,
                });
            if (error){
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

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={THEME.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Gradient Background for Top Section */}
            <LinearGradient
                colors={[THEME.secondary, THEME.primary]}
                style={styles.headerGradient}
            />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <View style={styles.header}>
                    <Text style={styles.title}>Mi Perfil</Text>
                    <TouchableOpacity onPress={() => router.push('/')} style={styles.settingsBtn}>
                        <Ionicons name="settings-outline" size={22} color="white" />
                    </TouchableOpacity>
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
                            isLast
                        />
                    </View>

                    {isWorkshop ? (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Tus Servicios Destacados</Text>
                            
                            <View style={styles.servicesListCard}>
                                {workshopServices.length === 0 ? (
                                    <View style={styles.emptyServices}>
                                        <Ionicons name="construct-outline" size={32} color={THEME.border} />
                                        <Text style={styles.emptyServicesText}>Aún no has agregado servicios.</Text>
                                    </View>
                                ) : (
                                    workshopServices.map((s, idx) => (
                                        <View key={idx} style={[styles.serviceRow, idx === workshopServices.length - 1 && { borderBottomWidth: 0 }]}>
                                            <View style={styles.serviceRowLeft}>
                                                <View style={styles.serviceIconBg}>
                                                    <Ionicons name="construct" size={16} color={THEME.primary} />
                                                </View>
                                                <Text style={styles.serviceNameText}>{s.service?.name}</Text>
                                            </View>
                                            <Text style={styles.servicePriceText}>${s.custom_price || 0}</Text>
                                        </View>
                                    ))
                                )}
                                
                                <TouchableOpacity 
                                    style={styles.manageButton}
                                    onPress={() => router.push('/workshop-admin')}
                                >
                                    <Text style={styles.manageButtonText}>Gestionar Inventario</Text>
                                    <Ionicons name="arrow-forward" size={16} color={THEME.primary} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Guardados</Text>

                            <View style={styles.emptyCard}>
                                <View style={styles.emptyCardIconBox}>
                                    <Ionicons name="bookmark" size={30} color={THEME.primary} />
                                </View>
                                <Text style={styles.emptyCardTitle}>No has guardado nada</Text>
                                <Text style={styles.emptyCardText}>Tus refacciones o servicios favoritos aparecerán aquí.</Text>

                                <TouchableOpacity style={styles.searchButton}>
                                    <Ionicons name="search" size={18} color={THEME.primary} style={{ marginRight: 8 }} />
                                    <Text style={styles.searchButtonText}>Explorar Catálogo</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Logout Button */}
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Ionicons name="log-out-outline" size={24} color={THEME.danger} />
                        <Text style={styles.logoutText}>Cerrar Sesión</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

function LinkRow({ icon, title, subtitle, onPress, isFirst, isLast }: { icon: any, title: string, subtitle: string, onPress?: () => void, isFirst?: boolean, isLast?: boolean }) {
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
                <Ionicons name={icon} size={22} color={THEME.primary} />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
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
        backgroundColor: THEME.bg,
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    settingsBtn: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 16,
    },
    profileCard: {
        backgroundColor: THEME.card,
        marginHorizontal: 24,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        elevation: 8,
        shadowColor: THEME.secondary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        marginBottom: 30,
        marginTop: 10,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    avatarWrapper: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 4,
        borderColor: 'white',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        marginBottom: 16,
        backgroundColor: '#E5E7EB',
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
        backgroundColor: THEME.primary,
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'white',
    },
    userName: {
        fontSize: 22,
        fontWeight: '900',
        color: THEME.secondary,
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
        color: THEME.primary,
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
        color: THEME.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 16,
        marginLeft: 8,
    },
    linksGroup: {
        backgroundColor: THEME.card,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: THEME.border,
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
        backgroundColor: THEME.card,
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
        borderBottomColor: THEME.border,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(33, 158, 188, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    actionText: {
        color: THEME.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    actionSubtext: {
        color: THEME.textMuted,
        fontSize: 12,
        lineHeight: 16,
    },
    section: {
        marginBottom: 30,
    },
    servicesListCard: {
        backgroundColor: THEME.card,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: THEME.border,
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
        color: THEME.textMuted,
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
        borderBottomColor: THEME.border,
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
        color: THEME.text,
        fontWeight: 'bold',
        flex: 1,
    },
    servicePriceText: {
        fontSize: 16,
        color: THEME.secondary,
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
        color: THEME.primary,
        fontWeight: '900',
        fontSize: 14,
    },
    emptyCard: {
        backgroundColor: THEME.card,
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: THEME.border,
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
        color: THEME.secondary,
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyCardText: {
        color: THEME.textMuted,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    searchButton: {
        flexDirection: 'row',
        backgroundColor: THEME.primary,
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: THEME.primary,
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
        color: THEME.danger,
        fontWeight: 'bold',
        fontSize: 16,
    }
});
