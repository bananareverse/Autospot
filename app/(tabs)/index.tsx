import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useAuth } from '@/ctx/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const THEME = {
    primary: '#219ebc',    // Cian Premium
    secondary: '#023047',  // Marino Profundo
    accent: '#fb8500',     // Naranja (Acento)
    bg: '#FFFFFF',
    card: '#F9FAFB',
    text: '#1F2937',
    textMuted: '#6B7280',
    border: '#E5E7EB',
};

export default function HomeScreen() {
    const router = useRouter();
    const { isWorkshop } = useAuth();
    const [workshops, setWorkshops] = useState<any[]>([]);
    const [searchText, setSearchText] = useState('');
    const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const filteredWorkshops = workshops.filter((workshop) =>
        workshop.name?.toLowerCase().includes(searchText.trim().toLowerCase())
    );

    useEffect(() => {
        if (isWorkshop) {
            router.replace('/workshop-admin');
            return;
        }
        fetchNearbyWorkshops();
    }, [isWorkshop]);

    function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    async function fetchNearbyWorkshops() {
        try {
            setLoading(true);
            let { data, error: wError } = await supabase.from('workshops_with_coords').select('*');

            if (wError || !data || data.length === 0) {
                const { data: directData, error: directError } = await supabase.from('workshops').select('*');
                if (!directError && directData) {
                    data = directData;
                } else if (wError && !directData) {
                    throw wError;
                }
            }

            let currentWorkshops = data || [];

            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
                    setUserLocation(location.coords);

                    currentWorkshops = currentWorkshops.map((w) => {
                        const distance = (w.latitude != null && w.longitude != null)
                            ? getDistanceInKm(location.coords.latitude, location.coords.longitude, w.latitude, w.longitude)
                            : 9999;
                        return { ...w, distance };
                    }).sort((a, b) => (a.distance || 0) - (b.distance || 0));
                }
            } catch (locError) {
                console.log("Location not available:", locError);
            }

            setWorkshops(currentWorkshops);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSignOut() {
        Alert.alert(
            "Cerrar Sesión",
            "¿Estás seguro que quieres salir?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Salir",
                    onPress: async () => {
                        const { error } = await supabase.auth.signOut();
                        if (error) Alert.alert("Error", error.message);
                    },
                    style: 'destructive'
                }
            ]
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Gradient Header overlay */}
            <LinearGradient
                colors={[THEME.secondary, THEME.primary]}
                style={styles.headerGradient}
            />

            <View style={styles.headerContent}>
                <View>
                    <Text style={styles.subTitle}>Bienvenido a</Text>
                    <Text style={styles.title}>AutoSpot</Text>
                </View>
            </View>

            {/* Search Bar matching the premium styling slightly overlapping the gradient */}
            <View style={styles.searchContainerWrapper}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color={THEME.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar taller por nombre..."
                        placeholderTextColor={THEME.textMuted}
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>
            </View>

            <View style={styles.listContainer}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="business" size={24} color={THEME.primary} />
                    <Text style={styles.sectionTitle}>TALLERES CERCANOS</Text>
                </View>

                {userLocation && !loading && !error && (
                    <Text style={styles.locationHint}>Ordenados por cercanía a tu ubicación</Text>
                )}

                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={THEME.primary} />
                        <Text style={styles.loadingText}>Buscando talleres...</Text>
                    </View>
                )}

                {error && (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle-outline" size={40} color={THEME.accent} />
                        <Text style={styles.errorText}>No se pudieron cargar los talleres</Text>
                        <Text style={styles.errorSubtext}>{error}</Text>
                    </View>
                )}

                {!loading && !error && (
                    <FlatList
                        data={filteredWorkshops}
                        keyExtractor={(item) => item.id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.card}
                                onPress={() => router.push({ pathname: '/workshop-details', params: { id: item.id } })}
                                activeOpacity={0.8}
                            >
                                <View style={styles.cardIconBox}>
                                    <Ionicons name="build" size={24} color={THEME.primary} />
                                </View>
                                <View style={styles.cardInfo}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                    </View>
                                    <Text style={styles.itemAddress} numberOfLines={2}>{item.address || 'Dirección no disponible'}</Text>
                                    
                                    <View style={styles.metaRow}>
                                        <View style={styles.metaBadge}>
                                            <Ionicons name="location" size={12} color={THEME.primary} />
                                            <Text style={styles.metaText}>{item.distance?.toFixed(2)} km</Text>
                                        </View>
                                        <View style={styles.metaBadge}>
                                            <Ionicons name="star" size={12} color={THEME.accent} />
                                            <Text style={styles.metaText}>{item.rating ?? 'N/A'} ({item.total_reviews ?? 0})</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="search-outline" size={48} color={THEME.border} />
                                <Text style={styles.emptyText}>No hay talleres que coincidan con tu búsqueda.</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.bg,
    },
    headerGradient: {
        height: 180,
        width: '100%',
        position: 'absolute',
        top: 0,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 24,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        marginBottom: 20,
    },
    subTitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        color: 'white',
        marginTop: 4,
    },
    logoutButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 16,
    },
    searchContainerWrapper: {
        paddingHorizontal: 24,
        marginTop: 5,
        marginBottom: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.card,
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 20,
        paddingHorizontal: 15,
        height: 55,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    searchInput: {
        flex: 1,
        color: THEME.text,
        fontSize: 16,
        marginLeft: 10,
    },
    listContainer: {
        flex: 1,
        paddingTop: 15,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 8,
        gap: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: THEME.secondary,
        letterSpacing: 2,
    },
    locationHint: {
        color: THEME.textMuted,
        fontSize: 12,
        paddingHorizontal: 24,
        marginBottom: 10,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 10,
        gap: 16,
    },
    card: {
        backgroundColor: THEME.card,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: THEME.border,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: THEME.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    cardIconBox: {
        width: 50,
        height: 50,
        borderRadius: 15,
        backgroundColor: 'rgba(33, 158, 188, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardInfo: {
        flex: 1,
    },
    cardHeader: {
        marginBottom: 4,
    },
    itemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: THEME.text,
    },
    itemAddress: {
        fontSize: 12,
        color: THEME.textMuted,
        marginBottom: 10,
        lineHeight: 16,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.bg,
        borderWidth: 1,
        borderColor: THEME.border,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },
    metaText: {
        color: THEME.secondary,
        fontSize: 11,
        fontWeight: 'bold',
    },
    loadingContainer: {
        marginTop: 50,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: THEME.textMuted,
        fontWeight: '600',
    },
    errorContainer: {
        padding: 40,
        alignItems: 'center',
    },
    errorText: {
        color: THEME.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 10,
    },
    errorSubtext: {
        color: THEME.textMuted,
        textAlign: 'center',
        fontSize: 13,
        marginTop: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        textAlign: 'center',
        color: THEME.textMuted,
        marginTop: 16,
        fontWeight: '500',
        paddingHorizontal: 40,
    }
});
