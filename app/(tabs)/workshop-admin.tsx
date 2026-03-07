import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/ctx/AuthContext';

type WorkshopContext = {
  workshopId: string;
  workshopName: string;
};

type Appointment = {
  id: string;
  scheduled_at: string;
  status: string;
  notes?: string | null;
};

type Service = {
  id: string;
  name: string;
};

const THEME = {
  bg: '#FFFFFF',
  text: '#111827',
  textSoft: '#6B7280',
  primary: '#2563EB',
  card: '#F9FAFB',
  border: '#E5E7EB',
  danger: '#DC2626',
};

export default function WorkshopAdminScreen() {
  const { isWorkshop } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ctx, setCtx] = useState<WorkshopContext | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const context = await getWorkshopContext();
      if (!context) {
        setCtx(null);
        return;
      }
      setCtx(context);

      const [{ data: appointmentData }, { data: serviceData }] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, scheduled_at, status, notes')
          .eq('workshop_id', context.workshopId)
          .order('scheduled_at', { ascending: true })
          .limit(30),
        supabase
          .from('service_catalog')
          .select('id, name')
          .eq('active', true)
          .order('name', { ascending: true }),
      ]);

      setAppointments((appointmentData || []) as Appointment[]);
      setServices((serviceData || []) as Service[]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo cargar el panel del taller.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function getWorkshopContext(): Promise<WorkshopContext | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('workshop_staff')
      .select('workshop_id, workshop:workshops(name)')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      workshopId: data.workshop_id,
      workshopName: (data as any).workshop?.name || 'Mi Taller',
    };
  }

  async function handleAddWorkshopService() {
    if (!ctx) return;
    if (!selectedServiceId) {
      Alert.alert('Faltan datos', 'Selecciona un servicio.');
      return;
    }

    setSaving(true);
    try {
      const parsedPrice = estimatedPrice.trim() ? Number(estimatedPrice) : null;
      if (parsedPrice != null && Number.isNaN(parsedPrice)) {
        Alert.alert('Precio inválido', 'Ingresa un número válido.');
        return;
      }

      const { error } = await supabase
        .from('workshop_services')
        .upsert({
          workshop_id: ctx.workshopId,
          service_id: selectedServiceId,
          estimated_price: parsedPrice,
          active: true,
        }, { onConflict: 'workshop_id,service_id' });

      if (error) throw error;

      setSelectedServiceId('');
      setEstimatedPrice('');
      Alert.alert('Listo', 'Servicio agregado al taller.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo agregar el servicio.');
    } finally {
      setSaving(false);
    }
  }

  if (!isWorkshop) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Mi Taller' }} />
        <Text style={styles.softText}>Esta sección está disponible solo para cuentas de taller.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Mi Taller' }} />
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  if (!ctx) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Mi Taller' }} />
        <Text style={styles.softText}>No encontramos un taller vinculado a esta cuenta.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Mi Taller' }} />

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{ctx.workshopName}</Text>
            <Text style={styles.subtitle}>Gestiona servicios y revisa tus próximas citas.</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Agregar servicio al taller</Text>

              <Text style={styles.label}>Servicio</Text>
              <View style={styles.chipWrap}>
                {services.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={[styles.chip, selectedServiceId === service.id && styles.chipActive]}
                    onPress={() => setSelectedServiceId(service.id)}
                  >
                    <Text style={[styles.chipText, selectedServiceId === service.id && styles.chipTextActive]}>{service.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Precio estimado (opcional)</Text>
              <TextInput
                style={styles.input}
                value={estimatedPrice}
                onChangeText={setEstimatedPrice}
                placeholder="Ej: 1200"
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.button, saving && { opacity: 0.7 }]}
                onPress={handleAddWorkshopService}
                disabled={saving}
              >
                <Text style={styles.buttonText}>Guardar servicio</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.cardTitle}>Próximas citas</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.appointmentCard}>
            <Text style={styles.appointmentDate}>{new Date(item.scheduled_at).toLocaleString()}</Text>
            <Text style={styles.appointmentStatus}>Estado: {item.status}</Text>
            {item.notes ? <Text style={styles.appointmentNotes}>{item.notes}</Text> : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.softText}>No hay citas registradas para este taller.</Text>}
        contentContainerStyle={{ paddingBottom: 28 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    padding: 16,
  },
  header: {
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: THEME.text,
  },
  subtitle: {
    color: THEME.textSoft,
    fontSize: 14,
  },
  card: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    color: THEME.textSoft,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    borderColor: THEME.primary,
    backgroundColor: '#DBEAFE',
  },
  chipText: {
    color: THEME.text,
    fontSize: 12,
  },
  chipTextActive: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  appointmentCard: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  appointmentDate: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
  },
  appointmentStatus: {
    marginTop: 4,
    color: THEME.textSoft,
  },
  appointmentNotes: {
    marginTop: 6,
    color: THEME.text,
    fontSize: 13,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bg,
    padding: 20,
  },
  softText: {
    color: THEME.textSoft,
    textAlign: 'center',
  },
});
