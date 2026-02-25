import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

// Nuevo Tema Claro
const THEME = {
  background: '#FFFFFF', // Blanco
  text: '#1F2937',       // Gris oscuro
  textLight: '#6B7280',  // Gris medio
  primary: '#2563EB',    // Azul vibrante
  secondary: '#1E3A8A',  // Azul oscuro
  cardBg: '#F9FAFB',     // Gris muy muy claro
  border: '#E5E7EB',     // Gris claro para bordes
  danger: '#EF4444',     // Rojo
};

export default function HomeScreen() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    try {
      const { data, error } = await supabase
        .from('service_catalog')
        .select('*');

      if (error) {
        throw error;
      }

      setServices(data);
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
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={THEME.danger} />
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Catálogo de Servicios</Text>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color={THEME.danger} />
          <Text style={styles.errorText}>No se pudieron cargar los servicios.</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.serviceName}>{item.name}</Text>
                <Text style={styles.servicePrice}>${item.estimated_price}</Text>
              </View>
              <Text style={styles.serviceDesc}>{item.description}</Text>
              <TouchableOpacity style={styles.cardButton}>
                <Text style={styles.cardButtonText}>Ver Detalles</Text>
                <Ionicons name="arrow-forward" size={16} color={THEME.primary} />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay servicios disponibles.</Text>
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
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.text,
    marginLeft: 24,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    flex: 1,
    marginRight: 10,
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.primary,
  },
  serviceDesc: {
    fontSize: 14,
    color: THEME.textLight,
    marginBottom: 16,
    lineHeight: 20,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardButtonText: {
    color: THEME.primary,
    fontWeight: '700',
    fontSize: 14,
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
