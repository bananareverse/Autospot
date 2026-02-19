import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const THEME = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#2563EB',
  secondary: '#1E3A8A',
  inputBg: '#F9FAFB',
  border: '#E5E7EB',
};

export default function ClientInfoScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [client, setClient] = useState<any>(null);

  // Form
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    loadClientInfo();
  }, []);

  async function loadClientInfo() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) return;

      let { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching client", error);
      }

      if (data) {
        setClient(data);
        setPhone(data.phone || '');
        setAddress(data.address || '');
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error("No user");

      const updates = {
        phone,
        address,
        // If the record doesn't exist, we might need to insert, but for now assuming update on existing from my-vehicles logic
        updated_at: new Date(),
      };

      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('email', user.email);

      if (error) throw error;

      Alert.alert('Éxito', 'Información actualizada');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={THEME.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ title: 'Mi Información', headerBackTitle: 'Perfil' }} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>

          <View style={styles.headerCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="person" size={40} color={THEME.primary} />
            </View>
            <Text style={styles.name}>{client?.first_name}</Text>
            <Text style={styles.email}>{client?.email}</Text>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Datos del Contacto</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Agrega tu número"
                keyboardType="phone-pad"
              />
            </View>

            

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Guardar Cambios</Text>}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  headerCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },
  iconCircle: {
    width: 80,
    height: 80,
    backgroundColor: '#EFF6FF',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.text,
  },
  email: {
    fontSize: 14,
    color: THEME.textLight,
    marginTop: 4,
  },
  formSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: THEME.inputBg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: THEME.text,
  },
  saveButton: {
    backgroundColor: THEME.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
