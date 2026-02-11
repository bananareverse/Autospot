import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

const THEME = {
    background: '#FFFFFF',
    text: '#1F2937',
    textLight: '#6B7280',
    primary: '#2563EB',
    secondary: '#1E3A8A',
    border: '#E5E7EB',
    cardBg: '#FFFFFF',
    danger: '#EF4444',
};

export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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
                    avatar: user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?background=2563EB&color=fff&size=200'
                });
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
                <ActivityIndicator color={THEME.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <Text style={styles.title}>Perfil</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Ionicons name="settings-outline" size={24} color={THEME.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: profile?.avatar }}
                        style={styles.avatar}
                    />
                    <View style={styles.verifiedBadge}>
                        <Ionicons name="person" size={12} color="white" />
                    </View>
                </View>
                <Text style={styles.userName}>{profile?.fullName}</Text>
                <Text style={styles.userRole}>{profile?.email}</Text>
            </View>

            <View style={styles.actionsContainer}>
                <LinkCard
                    icon="business-outline"
                    title="Información del Taller"
                    subtitle="Dirección, horarios y contacto"
                    onPress={() => router.push('/shop-info')}
                />
                <LinkCard
                    icon="card-outline"
                    title="Pagos y Facturación"
                    subtitle="Métodos de pago y facturas"
                    onPress={() => router.push('/payments')}
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
        backgroundColor: '#FEF2F2',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#EFF6FF',
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
        backgroundColor: '#EFF6FF',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    searchButtonText: {
        color: THEME.primary,
        fontWeight: '700',
        fontSize: 14,
    }
});
