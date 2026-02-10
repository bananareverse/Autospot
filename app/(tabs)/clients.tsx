import { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, ActivityIndicator, TouchableOpacity, Modal, TextInput, Alert, Dimensions, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Paleta de Colores "High Performance"
const THEME = {
    background: '#050505', // Casi negro puro
    cardBg: '#111111',     // Gris muy oscuro
    primary: '#00F0FF',    // Cyan Neón (Cyberpunk)
    secondary: '#FF003C',  // Rojo Deportivo
    text: '#FFFFFF',
    textSecondary: '#888888',
    border: '#333333',
    success: '#00FFA3',
};

export default function ClientsScreen() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Estado para el Modal y Formulario
    const [modalVisible, setModalVisible] = useState(false);
    const [newClient, setNewClient] = useState({ first_name: '', last_name: '', phone: '', email: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    async function fetchClients() {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.log('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    }

    // 3. Guardar Nuevo Cliente
    async function saveClient() {
        if (!newClient.first_name || !newClient.last_name) {
            Alert.alert('Faltan Datos', 'El nombre y apellido son obligatorios para el registro.');
            return;
        }
        setSaving(true);

        const { error } = await supabase
            .from('clients')
            .insert([newClient]);

        setSaving(false);

        if (error) {
            Alert.alert('Error', error.message);
        } else {
            setModalVisible(false);
            setNewClient({ first_name: '', last_name: '', phone: '', email: '' });
            fetchClients();
            // Feedback visual opcional aquí
        }
    }

    const renderClient = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardLeftStrip} /> {/* Tira de color decorativa */}
            <View style={styles.cardContent}>
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardName}>{item.first_name} {item.last_name}</Text>
                    <View style={styles.statusBadge}>
                        <View style={styles.runningDot} />
                        <Text style={styles.statusText}>ACTIVO</Text>
                    </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                    <Ionicons name="call" size={16} color={THEME.primary} />
                    <Text style={styles.infoText}>{item.phone || 'Sin registro'}</Text>
                </View>

                {item.email && (
                    <View style={styles.infoRow}>
                        <Ionicons name="mail" size={16} color={THEME.textSecondary} />
                        <Text style={styles.infoText}>{item.email}</Text>
                    </View>
                )}
            </View>

            <TouchableOpacity style={styles.actionArrow}>
                <Ionicons name="chevron-forward-outline" size={24} color={THEME.primary} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header Estilo Dashboard */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerLimit}>GARAGE MANAGER</Text>
                    <Text style={styles.headerTitle}>CLIENTS</Text>
                    <View style={styles.headerUnderline} />
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="add" size={32} color="black" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator color={THEME.primary} size="large" />
                    <Text style={styles.loadingText}>SINCRONIZANDO...</Text>
                </View>
            ) : (
                <FlatList
                    data={clients}
                    keyExtractor={(item) => item.id}
                    renderItem={renderClient}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.centerContainer}>
                            <View style={styles.emptyIconBg}>
                                <Ionicons name="car-sport-outline" size={60} color={THEME.primary} />
                            </View>
                            <Text style={styles.emptyTitle}>GARAJE VACÍO</Text>
                            <Text style={styles.emptyText}>Registra a tu primer cliente para comenzar la operación.</Text>
                        </View>
                    }
                />
            )}

            {/* MODAL "HEADS-UP DISPLAY" STYLE */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>NUEVO REGISTRO</Text>
                                <Text style={styles.modalSubtitle}>Ingresa los datos del cliente</Text>
                            </View>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                                <Ionicons name="close" size={20} color="white" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.formScroll}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>DATOS PERSONALES</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="NOMBRE(S)"
                                    placeholderTextColor="#555"
                                    value={newClient.first_name}
                                    onChangeText={(text) => setNewClient({ ...newClient, first_name: text })}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="APELLIDO(S)"
                                    placeholderTextColor="#555"
                                    value={newClient.last_name}
                                    onChangeText={(text) => setNewClient({ ...newClient, last_name: text })}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>CONTACTO</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="TELÉFONO MÓVIL"
                                    placeholderTextColor="#555"
                                    keyboardType="phone-pad"
                                    value={newClient.phone}
                                    onChangeText={(text) => setNewClient({ ...newClient, phone: text })}
                                />
                                <TextInput
                                    style={styles.input}
                                    placeholder="CORREO ELECTRÓNICO"
                                    placeholderTextColor="#555"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={newClient.email}
                                    onChangeText={(text) => setNewClient({ ...newClient, email: text })}
                                />
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={saveClient}
                            disabled={saving}
                            activeOpacity={0.8}
                        >
                            {saving ? (
                                <ActivityIndicator color="black" />
                            ) : (
                                <Text style={styles.saveButtonText}>CONFIRMAR REGISTRO</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.background,
        paddingTop: 60,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingHorizontal: 24,
        marginBottom: 30,
    },
    headerLimit: {
        color: THEME.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 36,
        fontWeight: '900',
        color: THEME.text,
        letterSpacing: -1,
        fontStyle: 'italic',
    },
    headerUnderline: {
        height: 4,
        width: 60,
        backgroundColor: THEME.primary,
        marginTop: 4,
        borderRadius: 2,
    },
    addButton: {
        backgroundColor: THEME.primary,
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
        transform: [{ rotate: '45deg' }], // Estilo diamante, icono rotado dentro
    },

    // List & Cards
    list: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 20,
    },
    card: {
        backgroundColor: THEME.cardBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: THEME.border,
        flexDirection: 'row',
        overflow: 'hidden',
        height: 100,
    },
    cardLeftStrip: {
        width: 6,
        backgroundColor: THEME.secondary,
    },
    cardContent: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardName: {
        color: THEME.text,
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    statusBadge: { // Badge pequeño "ACTIVO"
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 255, 163, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        gap: 6,
    },
    runningDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: THEME.success,
    },
    statusText: {
        color: THEME.success,
        fontSize: 10,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#222',
        marginVertical: 6,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    infoText: {
        color: '#bbb',
        fontSize: 12,
    },
    actionArrow: {
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
        borderLeftColor: THEME.border,
    },

    // Empty State
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: 60,
    },
    emptyIconBg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0, 240, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(0, 240, 255, 0.2)',
    },
    emptyTitle: {
        color: THEME.text,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
    },
    loadingText: {
        color: THEME.primary,
        marginTop: 16,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0F0F0F',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        borderTopColor: THEME.primary,
        padding: 24,
        height: '75%', // Modal ocupa 3/4 pantalla
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 30,
    },
    modalTitle: {
        color: THEME.text,
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
        letterSpacing: -0.5,
    },
    modalSubtitle: {
        color: '#666',
        fontSize: 12,
        marginTop: 4,
    },
    closeButton: {
        padding: 8,
        backgroundColor: '#222',
        borderRadius: 20,
    },
    formScroll: {
        flex: 1,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        color: THEME.primary,
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 12,
        letterSpacing: 1.5,
    },
    input: {
        backgroundColor: '#1A1A1A',
        color: 'white',
        height: 56,
        borderRadius: 8,
        paddingHorizontal: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
        marginBottom: 12,
    },
    saveButton: {
        backgroundColor: THEME.primary,
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20, // Espacio para safe area
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    saveButtonText: {
        color: 'black',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
});
