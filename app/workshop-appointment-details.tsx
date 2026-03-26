import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const THEME = {
  bg: '#F9FAFB',
  text: '#111827',
  textSoft: '#6B7280',
  primary: '#219ebc',
  secondary: '#023047',
  success: '#10B981',
  danger: '#EF4444',
  border: '#E5E7EB',
};

const STATUS_STEPS = [
  { key: 'scheduled', label: 'Programada' },
  { key: 'confirmed', label: 'Confirmada' },
  { key: 'in_progress', label: 'En proceso' },
  { key: 'ready', label: 'Listo para entrega' },
  { key: 'completed', label: 'Completado' },
];

function statusLabel(status: string) {
  switch (status) {
    case 'scheduled':
      return 'Programada';
    case 'confirmed':
      return 'Confirmada';
    case 'in_progress':
      return 'En proceso';
    case 'on_hold':
      return 'En revisión';
    case 'ready':
      return 'Listo para entrega';
    case 'completed':
      return 'Completado';
    case 'cancelled':
      return 'Cancelada';
    default:
      return status;
  }
}

function statusStyle(status: string) {
  switch (status) {
    case 'scheduled': return { bg: '#FEF3C7', color: '#92400E' };
    case 'confirmed': return { bg: '#DBEAFE', color: '#1E40AF' };
    case 'in_progress': return { bg: '#E0E7FF', color: '#312E81' };
    case 'on_hold': return { bg: '#FEE2E2', color: '#B91C1C' };
    case 'ready': return { bg: '#D1FAE5', color: '#065F46' };
    case 'completed': return { bg: '#A7F3D0', color: '#065F46' };
    case 'cancelled': return { bg: '#FECACA', color: '#991B1B' };
    default: return { bg: '#F3F4F6', color: '#6B7280' };
  }
}

function formatDate(dateString: string) {
  if (!dateString) return 'Fecha no disponible';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Fecha inválida';
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return 'Error en fecha';
  }
}

function formatTime(dateString: string) {
  if (!dateString) return 'Hora no disponible';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Hora inválida';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return 'Error en hora';
  }
}

export default function WorkshopAppointmentDetails() {
  const params = useLocalSearchParams();
  const appointmentId = Array.isArray(params.appointmentId) ? params.appointmentId[0] : params.appointmentId;
  const router = useRouter();

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadAppointment();
  }, []);

  const loadAppointment = async () => {
    setLoading(true);
    try {
      if (!appointmentId) {
        setError('No se encontró la cita');
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients(first_name,last_name,email,phone),
          vehicle:vehicles(make,model,license_plate,year,color),
          service:service_catalog(name,description,estimated_price)
        `)
        .eq('id', appointmentId)
        .single();

      if (queryError) {
        console.error("SUPABASE ERROR WAD:", queryError);
        setError('No se pudo cargar la cita');
      } else {
        let finalPrice = data.service?.estimated_price;
        if (data.workshop_id && data.service_id) {
            const { data: ws } = await supabase
                .from('workshop_services')
                .select('custom_price')
                .eq('workshop_id', data.workshop_id)
                .eq('service_id', data.service_id)
                .maybeSingle();
            if (ws?.custom_price) {
                finalPrice = ws.custom_price;
            }
        }
        data.final_price = finalPrice;
        setAppointment(data);
        setSelectedStatus(data?.status || '');
      }
    } catch (e) {
      console.error("TRYCATCH ERROR WAD:", e);
      setError('Error al cargar la cita');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string, reason?: string) => {
    if (!appointment) return;
    setSaving(true);
    try {
      const payload: any = { status: newStatus };
      if (newStatus === 'on_hold') {
        payload.notes = reason || 'En revisión';
      }

      const { error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', appointment.id);
      if (error) throw error;

      setAppointment({ ...appointment, status: newStatus, notes: payload.notes ?? appointment.notes });
      setSelectedStatus(newStatus);
      if (newStatus === 'on_hold') setHoldReason('');
      if (newStatus === 'cancelled') {
        setCancelMode(false);
        setCancelReason('');
      }
      Alert.alert('Éxito', `Estado actualizado: ${statusLabel(newStatus)}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo actualizar el estado.');
    } finally {
      setSaving(false);
      setStatusDropdownOpen(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  if (error || !appointment) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Cita no encontrada'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusOrder: Record<string, number> = {
    scheduled: 0,
    confirmed: 1,
    in_progress: 2,
    ready: 3,
    completed: 4,
  };

  const currentStep = statusOrder[appointment.status] !== undefined ? statusOrder[appointment.status] : -1;
  const canCancel = appointment.status !== 'completed' && appointment.status !== 'cancelled';

  const nextStageAction = () => {
    const st = appointment.status;
    if (st === 'scheduled') return { label: 'Confirmar', nextStatus: 'confirmed' };
    if (st === 'confirmed') return { label: 'Iniciar', nextStatus: 'in_progress' };
    if (st === 'in_progress') return { label: 'Listo para entrega', nextStatus: 'ready' };
    if (st === 'ready') return { label: 'Completar', nextStatus: 'completed' };
    return null;
  };

  const stepFlow = STATUS_STEPS;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'Gestionar Cita',
      }} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusBadgeCard}>
          <Text style={[styles.statusBadgeText, { color: statusStyle(appointment.status).color }]}>Estado: {statusLabel(appointment.status)}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Seguimiento</Text>
          <View style={styles.flowContainer}>
            {STATUS_STEPS.map((step, index) => {
              const completed = index <= currentStep;
              return (
                <View key={step.key} style={styles.flowRow}>
                  <View style={[styles.flowDot, completed ? styles.flowDotActive : null]}>
                    <Ionicons name={completed ? 'checkmark' : 'ellipse-outline'} size={12} color="white" />
                  </View>
                  <Text style={[styles.flowLabel, completed ? styles.flowLabelActive : null]}>{step.label}</Text>
                  {index < STATUS_STEPS.length - 1 && <View style={[styles.flowLine, completed ? styles.flowLineActive : null]} />}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.statusSelectContainer}>
          <Text style={styles.statusSelectLabel}>Cambiar estado</Text>

          <TouchableOpacity
            style={[styles.statusSelectButton, { borderColor: statusStyle(selectedStatus || appointment.status).color }]}
            onPress={() => setStatusDropdownOpen(!statusDropdownOpen)}
            disabled={saving}
          >
            <Text style={styles.statusSelectButtonText}>{statusLabel(selectedStatus || appointment.status)}</Text>
            <Ionicons name={statusDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color={statusStyle(selectedStatus || appointment.status).color} />
          </TouchableOpacity>

          {statusDropdownOpen ? (
            <View style={styles.statusDropdown}>
              {['in_progress', 'on_hold', 'ready', 'completed', 'cancelled'].map((statusValue) => (
                <TouchableOpacity
                  key={statusValue}
                  style={styles.statusOption}
                  onPress={() => {
                    setSelectedStatus(statusValue);
                    setStatusDropdownOpen(false);
                    if (statusValue !== 'on_hold') setHoldReason('');
                  }}
                >
                  <Text style={[styles.statusOptionText, { color: statusStyle(statusValue).color }]}>{statusLabel(statusValue)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {selectedStatus === 'on_hold' && (
            <View style={styles.holdReasonBox}>
              <Text style={styles.detailKey}>Motivo de revisión</Text>
              <TextInput
                style={styles.holdReasonInput}
                value={holdReason}
                onChangeText={setHoldReason}
                placeholder="Describe la razón..."
                editable={!saving}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: THEME.secondary, marginTop: 10 }]}
            onPress={() => {
              if (selectedStatus === 'on_hold' && !holdReason.trim()) {
                Alert.alert('Requerido', 'Agrega razón para poner en revisión.');
                return;
              }
              updateStatus(selectedStatus || appointment.status, selectedStatus === 'on_hold' ? holdReason.trim() : undefined);
            }}
            disabled={saving || !selectedStatus}
          >
            <Ionicons name="save-outline" size={16} color="white" />
            <Text style={styles.actionButtonText}>Guardar estado</Text>
          </TouchableOpacity>

          {canCancel && (
            <View style={{ marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: THEME.danger }]}
                onPress={() => setCancelMode(true)}
                disabled={saving}
              >
                <Ionicons name="close-circle" size={16} color="white" />
                <Text style={styles.actionButtonText}>Cancelar Cita</Text>
              </TouchableOpacity>

              {cancelMode && (
                <View style={styles.cancelReasonBox}>
                  <Text style={styles.detailKey}>Motivo de cancelación</Text>
                  <TextInput
                    style={styles.holdReasonInput}
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    placeholder="Describe por qué se cancela"
                    editable={!saving}
                  />
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: THEME.danger, marginTop: 8 }]}
                    onPress={() => {
                      if (!cancelReason.trim()) {
                        Alert.alert('Requerido', 'Debes indicar la razón de cancelación.');
                        return;
                      }
                      updateStatus('cancelled', cancelReason.trim());
                    }}
                    disabled={saving}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="white" />
                    <Text style={styles.actionButtonText}>Confirmar cancelación</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#E5E7EB', marginTop: 8 }]}
                    onPress={() => { setCancelMode(false); setCancelReason(''); }}
                    disabled={saving}
                  >
                    <Text style={[styles.actionButtonText, { color: THEME.text }]}>Volver</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Detalles de la Cita</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Fecha:</Text> {formatDate(appointment.scheduled_at)}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Hora:</Text> {formatTime(appointment.scheduled_at)}</Text>
          {appointment.notes ? <Text style={styles.detailRow}><Text style={styles.detailKey}>Notas:</Text> {appointment.notes}</Text> : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Nombre:</Text> {appointment.client?.first_name} {appointment.client?.last_name}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Email:</Text> {appointment.client?.email || 'N/A'}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Teléfono:</Text> {appointment.client?.phone || 'N/A'}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Vehículo</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Vehículo:</Text> {appointment.vehicle?.make} {appointment.vehicle?.model} ({appointment.vehicle?.license_plate})</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Año:</Text> {appointment.vehicle?.year || 'N/A'}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Color:</Text> {appointment.vehicle?.color || 'N/A'}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Servicio</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Nombre:</Text> {appointment.service?.name || 'N/A'}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Descripción:</Text> {appointment.service?.description || 'N/A'}</Text>
          <Text style={styles.detailRow}><Text style={styles.detailKey}>Precio Estimado:</Text> {appointment.final_price != null ? `$${appointment.final_price.toFixed(2)}` : 'N/A'}</Text>
        </View>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.bg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: THEME.danger,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  backBtnText: {
    color: 'white',
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  statusBadgeCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  sectionTitle: {
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 10,
  },
  flowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  flowRow: {
    alignItems: 'center',
    width: '22%',
  },
  flowLine: {
    position: 'absolute',
    top: 12,
    left: '100%',
    width: 20,
    height: 2,
    backgroundColor: '#D1D5DB',
    zIndex: -1,
  },
  flowLineActive: {
    backgroundColor: THEME.primary,
  },
  flowDot: {
    width: 24,
    height: 24,
    borderRadius: 99,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  flowDotActive: {
    backgroundColor: THEME.primary,
  },
  flowLabel: {
    fontSize: 10,
    textAlign: 'center',
    color: THEME.textSoft,
  },
  flowLabelActive: {
    color: THEME.text,
    fontWeight: '700',
  },
  statusSelectContainer: {
    marginTop: 16,
  },
  statusSelectLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.textSoft,
    marginBottom: 8,
  },
  statusSelectButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: THEME.border,
  },
  statusSelectButtonText: {
    fontSize: 14,
    color: THEME.text,
    fontWeight: '700',
  },
  statusDropdown: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  statusOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  holdReasonBox: {
    marginTop: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
  },
  cancelReasonBox: {
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  holdReasonInput: {
    marginTop: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    padding: 10,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  detailRow: {
    fontSize: 14,
    color: THEME.text,
    marginBottom: 4,
  },
  detailKey: {
    fontWeight: '700',
  },
});