import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useAuth } from '@/ctx/AuthContext';

// Nuevo Tema Claro
const THEME = {
  background: '#FFFFFF', // Blanco
  text: '#1F2937',       // Gris oscuro
  textLight: '#6B7280',  // Gris medio
  primary: '#219ebc',    // Azul cian
  secondary: '#023047',  // Azul marino profundo
  cardBg: '#F9FAFB',     // Gris muy muy claro
  border: '#E5E7EB',     // Gris claro para bordes
  danger: '#EF4444',     // Rojo
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
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async function fetchNearbyWorkshops() {
    try {
      setLoading(true);

      // Fetch workshops first (no dependencies)
      let { data, error: wError } = await supabase
        .from('workshops_with_coords')
        .select('*');

      // Fallback: Si la vista no existe o está vacía, intentar tabla directa sin filtros
      if (wError || !data || data.length === 0) {
        const { data: directData, error: directError } = await supabase
          .from('workshops')
          .select('*');

        if (!directError && directData) {
          data = directData;
        } else if (wError && !directData) {
          throw wError;
        }
      }

      let currentWorkshops = data || [];

      // Try to get location, but don't block the UI if it fails/denies
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation(location.coords);

          currentWorkshops = currentWorkshops.map((w) => {
            const distance = (w.latitude != null && w.longitude != null)
              ? getDistanceInKm(
                location.coords.latitude,
                location.coords.longitude,
                w.latitude,
                w.longitude
              )
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
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View>
          <Text style={styles.subTitle}>Bienvenido a</Text>
          <Text style={styles.title}>AutoSpot</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Talleres Cercanos</Text>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={THEME.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar taller"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {userLocation && !loading && !error && (
        <Text style={styles.locationHint}>Ordenados por cercanía a tu ubicación actual</Text>
      )}

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={THEME.danger} />
          <Text style={styles.errorText}>No se pudieron cargar los talleres cercanos.</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={filteredWorkshops}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/workshop-details', params: { id: item.id } })}
              activeOpacity={0.9}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <Text style={styles.itemAddress}>{item.address || 'Dirección no disponible'}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{item.distance?.toFixed(2)} km</Text>
                <Text style={styles.metaText}>⭐ {item.rating ?? 'N/A'} ({item.total_reviews ?? 0} reseñas)</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay talleres que coincidan con tu búsqueda.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  subTitle: {
    fontSize: 14,
    color: THEME.textLight,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: THEME.secondary, // Azul oscuro
  },
  logoutButton: {
    padding: 10,
    backgroundColor: '#e0f2fe', // Celeste muy claro
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginLeft: 24,
    marginBottom: 10,
  },
  searchContainer: {
    marginHorizontal: 24,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    backgroundColor: THEME.cardBg,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: THEME.text,
    fontSize: 15,
  },
  locationHint: {
    color: THEME.textLight,
    fontSize: 12,
    marginHorizontal: 24,
    marginBottom: 10,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  loadingContainer: {
    marginTop: 50,
  },
  card: {
    backgroundColor: THEME.cardBg,
    padding: 20,
    borderRadius: 16,
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
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    flex: 1,
    marginRight: 10,
  },
  itemAddress: {
    fontSize: 14,
    color: THEME.textLight,
    marginBottom: 10,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    color: THEME.text,
    fontSize: 13,
    fontWeight: '600',
  },

  // States
  emptyText: {
    textAlign: 'center',
    color: THEME.textLight,
    marginTop: 40,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    color: THEME.text,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  errorSubtext: {
    color: THEME.textLight,
    textAlign: 'center',
    fontSize: 14,
    marginTop: 4,
  }
});
