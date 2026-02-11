import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function ShopInfoScreen() {
    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Stack.Screen options={{ title: 'Información del Taller', headerBackTitle: 'Volver' }} />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerCard}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="business" size={40} color="#2563EB" />
                    </View>
                    <Text style={styles.shopName}>AutoSpot Taller</Text>
                    <Text style={styles.shopSubtitle}>Especialistas en Mecánica General</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Dirección</Text>
                    <View style={styles.row}>
                        <Ionicons name="location-outline" size={24} color="#6B7280" />
                        <Text style={styles.text}>Av. Revolución 1234, Col. Centro, Ciudad de México</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Horarios</Text>
                    <View style={styles.row}>
                        <Ionicons name="time-outline" size={24} color="#6B7280" />
                        <View>
                            <Text style={styles.text}>Lunes a Viernes: 9:00 AM - 6:00 PM</Text>
                            <Text style={styles.text}>Sábados: 9:00 AM - 2:00 PM</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contacto</Text>
                    <View style={styles.row}>
                        <Ionicons name="call-outline" size={24} color="#6B7280" />
                        <Text style={styles.text}>55 1234 5678</Text>
                    </View>
                    <View style={styles.row}>
                        <Ionicons name="mail-outline" size={24} color="#6B7280" />
                        <Text style={styles.text}>contacto@autospot.mx</Text>
                    </View>
                </View>
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
    headerCard: {
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    iconContainer: {
        width: 80,
        height: 80,
        backgroundColor: '#EFF6FF',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    shopName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    shopSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    section: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    text: {
        fontSize: 16,
        color: '#4B5563',
        flex: 1,
        lineHeight: 24,
    },
});
