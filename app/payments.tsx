import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentsScreen() {
    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Stack.Screen options={{ title: 'Pagos y Facturación' }} />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Balance Card */}
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Saldo Pendiente</Text>
                    <Text style={styles.balanceAmount}>$0.00</Text>
                    <Text style={styles.balanceSub}>Estás al día con tus pagos.</Text>
                </View>

                <Text style={styles.sectionTitle}>Historial de Pagos</Text>

                <View style={styles.emptyState}>
                    <Ionicons name="receipt-outline" size={60} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No hay movimientos recientes</Text>
                </View>

                <Text style={styles.sectionTitle}>Métodos de Pago</Text>
                <TouchableOpacity style={styles.addPaymentButton}>
                    <Ionicons name="add-circle-outline" size={24} color="#2563EB" />
                    <Text style={styles.addPaymentText}>Agregar Tarjeta</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    content: {
        padding: 20,
        gap: 20,
    },
    balanceCard: {
        backgroundColor: '#2563EB',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    balanceAmount: {
        color: 'white',
        fontSize: 36,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    balanceSub: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 10,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    emptyText: {
        color: '#9CA3AF',
        marginTop: 10,
        fontSize: 16,
    },
    addPaymentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 8,
    },
    addPaymentText: {
        color: '#2563EB',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
