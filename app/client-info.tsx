import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

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
      };

      const { error } = await supabase
        .from('clients')
        .update(updates)
        .eq('email', user.email);

      if (error) throw error;

      setClient({ ...client, phone, address });
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
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack.Screen options={{ 
          title: 'Mi Información', 
          headerTintColor: 'white',
          headerTransparent: true,
          headerStyle: { backgroundColor: 'transparent' },
          headerTitleStyle: { fontWeight: '900', fontSize: 20 },
      }} />

      <LinearGradient
          colors={[THEME.secondary, THEME.primary]}
          style={styles.headerGradient}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>

          <View style={styles.profileCard}>
            <Ionicons name="person-circle" size={100} color={THEME.primary} style={{ marginBottom: 5 }} />
            <Text style={styles.name}>{client?.first_name} {client?.last_name}</Text>
            <Text style={styles.email}>{client?.email}</Text>
            
            {client?.phone ? (
              <View style={styles.phoneBadge}>
                <Ionicons name="call" size={14} color={THEME.primary} />
                <Text style={styles.phoneText}>{client.phone}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Datos de Contacto</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color={THEME.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Ej. 55 1234 5678"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dirección (Opcional)</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="location-outline" size={20} color={THEME.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Calle, Número, Colonia"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.infoBox}>
                <Ionicons name="shield-checkmark" size={20} color={THEME.primary} />
                <Text style={styles.infoText}>Estos datos solo se usarán para contactarte sobre tus citas.</Text>
            </View>

            <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="white" /> : (
                  <>
                      <Ionicons name="save" size={20} color="white" />
                      <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                  </>
              )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bg,
  },
  content: {
    flexGrow: 1,
    paddingTop: 130, 
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: THEME.card,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: THEME.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.secondary,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: THEME.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 158, 188, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    gap: 8,
  },
  phoneText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.primary,
    letterSpacing: 0.5,
  },
  formSection: {
    backgroundColor: THEME.card,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.secondary,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bg,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 55,
    fontSize: 16,
    color: THEME.text,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 158, 188, 0.05)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(33, 158, 188, 0.2)',
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: THEME.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: THEME.primary,
    padding: 18,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
  }
});
