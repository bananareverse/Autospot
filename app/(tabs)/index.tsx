import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

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
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Servicios</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color="#ff4d4d" />
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator size="large" color="white" />}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error de conexión:</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.serviceName}>{item.name}</Text>
              <Text style={styles.servicePrice}>${item.estimated_price}</Text>
              <Text style={styles.serviceDesc}>{item.description}</Text>
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    borderRadius: 12,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0f3460',
  },
  serviceName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  servicePrice: {
    fontSize: 18,
    color: '#4cc9f0',
    marginTop: 4,
  },
  serviceDesc: {
    fontSize: 14,
    color: '#a0a0a0',
    marginTop: 8,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#ff4d4d',
    textAlign: 'center',
    fontSize: 16,
  }
});
