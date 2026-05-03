import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '@/hooks/useAppTheme';

export default function ClientInfoScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);

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
        <ActivityIndicator size="large" color={theme.primary} />
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
          colors={[theme.secondary, theme.primary]}
          style={styles.headerGradient}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>

          <View style={styles.profileCard}>
            <Ionicons name="person-circle" size={100} color={theme.primary} style={{ marginBottom: 5 }} />
            <Text style={styles.name}>{client?.first_name} {client?.last_name}</Text>
            <Text style={styles.email}>{client?.email}</Text>
            
            {client?.phone ? (
              <View style={styles.phoneBadge}>
                <Ionicons name="call" size={14} color={theme.primary} />
                <Text style={styles.phoneText}>{client.phone}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Datos de Contacto</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
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
                <Ionicons name="location-outline" size={20} color={theme.textMuted} style={styles.inputIcon} />
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
                <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
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

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
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
    backgroundColor: theme.bg,
  },
  content: {
    flexGrow: 1,
    paddingTop: 130, 
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: theme.card,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: theme.secondary,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: theme.textMuted,
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
    color: theme.primary,
    letterSpacing: 0.5,
  },
  formSection: {
    backgroundColor: theme.card,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.secondary,
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
    color: theme.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
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
    color: theme.text,
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
    color: theme.primary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: theme.primary,
    padding: 18,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.primary,
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
