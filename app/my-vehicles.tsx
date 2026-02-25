import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { getUserVehicles, addVehicle } from '@/lib/vehicles';
import { getBrands, getModelsByBrand, VehicleBrand, VehicleModel } from '@/lib/vehicle-catalog';
import { Picker } from '@react-native-picker/picker';

const THEME = {
    background: '#FFFFFF',
    text: '#1F2937',
    textLight: '#6B7280',
    primary: '#2563EB',
    secondary: '#1E3A8A',
    cardBg: '#F3F4F6',
};

export default function MyVehiclesScreen() {
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    // Catalog data
    const [brands, setBrands] = useState<VehicleBrand[]>([]);
    const [models, setModels] = useState<VehicleModel[]>([]);

    // Form State
    const [selectedBrandId, setSelectedBrandId] = useState('');
    const [selectedModelId, setSelectedModelId] = useState('');

    useEffect(() => {
        loadVehicles();
        loadBrands();
    }, []);

    async function loadBrands() {
        try {
            const data = await getBrands();
            setBrands(data);
        } catch (e) {
            console.log("Error loading brands", e);
        }
    }

    async function loadVehicles() {
        try {
            const data = await getUserVehicles('');
            setVehicles(data || []);
        } catch (e) {
            console.log("Error loading vehicles", e);
        } finally {
            setLoading(false);
        }
    }

    async function handleBrandChange(brandId: string) {
        setSelectedBrandId(brandId);
        setSelectedModelId(''); // Reset model
        if (brandId) {
            try {
                const data = await getModelsByBrand(brandId);
                setModels(data);
            } catch (e) {
                console.log("Error loading models", e);
            }
        } else {
            setModels([]);
        }
    }

    async function handleSaveVehicle() {
        if (!selectedBrandId || !selectedModelId) {
            Alert.alert('Faltan datos', 'Por favor selecciona Marca y Modelo');
            return;
        }

        const selectedBrand = brands.find(b => b.id === selectedBrandId);
        const selectedModel = models.find(m => m.id === selectedModelId);

        setSaving(true);
        try {
            await addVehicle({
                make: selectedBrand?.name || '',
                model: selectedModel?.name || '',
                year: new Date().getFullYear(),
                license_plate: `AUTO-${Date.now().toString().slice(-6)}`,
                color: 'N/A',
                client_id: '',
            });
            setModalVisible(false);
            resetForm();
            loadVehicles();
            Alert.alert('Éxito', 'Vehículo registrado correctamente');
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    }

    function resetForm() {
        setSelectedBrandId('');
        setSelectedModelId('');
        setModels([]);
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Stack.Screen options={{ title: 'Mis Vehículos', headerBackTitle: 'Perfil' }} />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={THEME.primary} size="large" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    {vehicles.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="car-sport-outline" size={60} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No tienes vehículos registrados</Text>
                        </View>
                    ) : (
                        vehicles.map((car) => (
                            <View key={car.id} style={styles.carCard}>
                                <View style={styles.carIconBox}>
                                    <Ionicons name="car-sport" size={32} color={THEME.primary} />
                                </View>
                                <View style={styles.carInfo}>
                                    <Text style={styles.carTitle}>{car.make} {car.model}</Text>
                                    <Text style={styles.carPlate}>{car.license_plate}</Text>
                                </View>
                                <TouchableOpacity>
                                    <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}

                    <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                        <Ionicons name="add" size={24} color="white" />
                        <Text style={styles.addButtonText}>Registrar Nuevo Auto</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            {/* MODAL DE REGISTRO */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Nuevo Vehículo</Text>
                            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                                <Ionicons name="close-circle" size={30} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            {/* Marca Dropdown */}
                            <Text style={styles.label}>Marca</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={selectedBrandId}
                                    onValueChange={handleBrandChange}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Selecciona una marca..." value="" />
                                    {brands.map(brand => (
                                        <Picker.Item key={brand.id} label={brand.name} value={brand.id} />
                                    ))}
                                </Picker>
                            </View>

                            {/* Modelo Dropdown */}
                            <Text style={styles.label}>Modelo</Text>
                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={selectedModelId}
                                    onValueChange={setSelectedModelId}
                                    enabled={!!selectedBrandId}
                                    style={styles.picker}
                                >
                                    <Picker.Item label="Selecciona un modelo..." value="" />
                                    {models.map(model => (
                                        <Picker.Item key={model.id} label={model.name} value={model.id} />
                                    ))}
                                </Picker>
                            </View>

                        </ScrollView>

                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveVehicle} disabled={saving}>
                            {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveButtonText}>Guardar Vehículo</Text>}
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
        backgroundColor: '#FFFFFF',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 20,
        gap: 16,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        opacity: 0.7,
    },
    emptyText: {
        marginTop: 10,
        color: THEME.textLight,
        fontSize: 16,
    },
    carCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    carIconBox: {
        width: 50,
        height: 50,
        backgroundColor: '#EFF6FF',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    carInfo: {
        flex: 1,
    },
    carTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: THEME.text,
    },
    carPlate: {
        fontSize: 14,
        color: THEME.textLight,
        marginTop: 2,
        textTransform: 'uppercase',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: THEME.primary,
        padding: 18,
        borderRadius: 12,
        marginTop: 10,
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '85%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: THEME.text,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME.text,
        marginBottom: 8,
        marginTop: 12,
    },
    pickerContainer: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 12,
    },
    saveButton: {
        backgroundColor: THEME.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
