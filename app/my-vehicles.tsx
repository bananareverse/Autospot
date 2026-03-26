import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { getUserVehicles, addVehicle, deleteVehicle } from '@/lib/vehicles';
import { getBrands, getModelsByBrand, VehicleBrand, VehicleModel } from '@/lib/vehicle-catalog';
import { Picker } from '@react-native-picker/picker';
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
        setSelectedModelId(''); 
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

    function handleDeleteVehicle(id: string) {
        Alert.alert(
            "Eliminar Vehículo",
            "¿Estás seguro que deseas eliminar este vehículo de tu lista?",
            [
                { text: "Cancelar", style: "cancel" },
                { 
                    text: "Eliminar", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await deleteVehicle(id);
                            loadVehicles();
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                            setLoading(false);
                        }
                    } 
                }
            ]
        );
    }

    function resetForm() {
        setSelectedBrandId('');
        setSelectedModelId('');
        setModels([]);
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Stack.Screen options={{ 
                title: 'Mis Vehículos', 
                headerTintColor: 'white',
                headerTransparent: true,
                headerStyle: { backgroundColor: 'transparent' },
                headerTitleStyle: { fontWeight: '900', fontSize: 20 },
            }} />

            <LinearGradient
                colors={[THEME.secondary, THEME.primary]}
                style={styles.headerGradient}
            />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={THEME.primary} size="large" />
                    <Text style={{ marginTop: 10, color: THEME.textMuted }}>Sincronizando garaje...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {vehicles.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconBox}>
                                <Ionicons name="car-sport" size={60} color={THEME.primary} />
                            </View>
                            <Text style={styles.emptyTitle}>Sin vehículos</Text>
                            <Text style={styles.emptyText}>Registra tu primer auto para comenzar a agendar citas.</Text>
                        </View>
                    ) : (
                        vehicles.map((car) => (
                            <View key={car.id} style={styles.carCard}>
                                <View style={styles.carIconBox}>
                                    <Ionicons name="car-sport" size={28} color={THEME.primary} />
                                </View>
                                <View style={styles.carInfo}>
                                    <Text style={styles.carTitle} numberOfLines={1}>{car.make} {car.model}</Text>
                                    <View style={styles.plateBadge}>
                                        <Text style={styles.carPlate}>{car.license_plate}</Text>
                                    </View>
                                </View>
                                <TouchableOpacity 
                                    style={styles.deleteButton}
                                    onPress={() => handleDeleteVehicle(car.id)}
                                >
                                    <Ionicons name="trash-outline" size={20} color={THEME.danger} />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}

                    <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
                        <Ionicons name="add-circle-outline" size={24} color="white" />
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
                            <TouchableOpacity style={styles.closeBtn} onPress={() => { setModalVisible(false); resetForm(); }}>
                                <Ionicons name="close" size={24} color={THEME.text} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            
                            {/* Marca Selection */}
                            <Text style={styles.label}>1. Selecciona la Marca</Text>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false} 
                                contentContainerStyle={styles.chipScrollContainer}
                                style={styles.chipScroll}
                            >
                                {brands.map(brand => (
                                    <TouchableOpacity 
                                        key={brand.id}
                                        style={[styles.chip, selectedBrandId === brand.id && styles.activeChip]}
                                        onPress={() => handleBrandChange(brand.id)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.chipText, selectedBrandId === brand.id && styles.activeChipText]}>
                                            {brand.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Modelo Selection */}
                            <Text style={styles.label}>2. Selecciona el Modelo</Text>
                            {selectedBrandId ? (
                                <View style={styles.modelsGrid}>
                                    {models.map(model => (
                                        <TouchableOpacity 
                                            key={model.id}
                                            style={[styles.modelChip, selectedModelId === model.id && styles.activeModelChip]}
                                            onPress={() => setSelectedModelId(model.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.modelChipText, selectedModelId === model.id && styles.activeChipText]}>
                                                {model.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : (
                                <View style={styles.disabledModelBox}>
                                    <Ionicons name="car-sport-outline" size={30} color={THEME.border} />
                                    <Text style={styles.disabledModelText}>Elige una marca para ver sus modelos</Text>
                                </View>
                            )}
                        </ScrollView>

                        <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.7 }]} onPress={handleSaveVehicle} disabled={saving}>
                            {saving ? <ActivityIndicator color="white" /> : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="white" />
                                    <Text style={styles.saveButtonText}>Guardar Vehículo</Text>
                                </>
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
        backgroundColor: THEME.bg,
    },
    headerGradient: {
        height: 140,
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
    },
    content: {
        paddingTop: 110,
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 16,
    },
    emptyState: {
        alignItems: 'center',
        backgroundColor: THEME.card,
        borderRadius: 24,
        padding: 40,
        borderWidth: 1,
        borderColor: THEME.border,
        marginTop: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    emptyIconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(33, 158, 188, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: THEME.secondary,
        marginBottom: 8,
    },
    emptyText: {
        color: THEME.textMuted,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    carCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: THEME.border,
        shadowColor: THEME.secondary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        marginBottom: 4,
    },
    carIconBox: {
        width: 50,
        height: 50,
        backgroundColor: 'rgba(33, 158, 188, 0.1)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    carInfo: {
        flex: 1,
    },
    carTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: THEME.text,
        marginBottom: 6,
    },
    plateBadge: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    carPlate: {
        fontSize: 12,
        color: THEME.textMuted,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    deleteButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: THEME.primary,
        padding: 16,
        borderRadius: 16,
        marginTop: 20,
        shadowColor: THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        gap: 8,
    },
    addButtonText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 16,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(2, 48, 71, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: THEME.bg,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: THEME.secondary,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: THEME.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: THEME.border,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: THEME.text,
        marginBottom: 8,
        marginLeft: 4,
    },
    chipScroll: {
        marginHorizontal: -24, // bleed to edges of modal
        marginBottom: 24,
    },
    chipScrollContainer: {
        paddingHorizontal: 24,
        gap: 12,
    },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: THEME.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: THEME.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    activeChip: {
        backgroundColor: THEME.primary,
        borderColor: THEME.primary,
        shadowColor: THEME.primary,
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    chipText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: THEME.textMuted,
    },
    activeChipText: {
        color: 'white',
    },
    modelsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    modelChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: THEME.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: THEME.border,
    },
    activeModelChip: {
        backgroundColor: THEME.secondary,
        borderColor: THEME.secondary,
        shadowColor: THEME.secondary,
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 3,
    },
    modelChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME.text,
    },
    disabledModelBox: {
        backgroundColor: THEME.bg,
        borderWidth: 2,
        borderColor: THEME.border,
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        gap: 10,
    },
    disabledModelText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '600',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(33, 158, 188, 0.05)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(33, 158, 188, 0.2)',
        marginTop: 10,
        gap: 10,
    },
    infoText: {
        flex: 1,
        color: THEME.primary,
        fontSize: 13,
        lineHeight: 18,
    },
    saveButton: {
        flexDirection: 'row',
        backgroundColor: THEME.primary,
        padding: 18,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
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
